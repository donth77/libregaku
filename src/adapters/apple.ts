import { ui } from '../i18n';
import { fitOffset, pairsFrom, type Pair, type Timed } from './apple-clock';
import { isAppleMediaUrl as isMediaUrl } from './apple-hosts';
import { cuesFromSegments, segmentUrls, subtitleRenditions, type HlsRendition } from './hls';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Apple TV. The player plays HLS: the master playlist lists each subtitle
 * track as a rendition, and a rendition is a playlist of WebVTT segments, one
 * minute long each. `inject-apple.ts` passes on the master playlist the player
 * itself fetched, and every rendition and segment URL resolves against it.
 *
 * The files' cue times are a fixed number of seconds (about a minute) behind
 * the <video>'s clock, for as long as one playback lasts. The adapter learns
 * that number from the player's own captions: the browser fills a text track's
 * cues once it is showing, and the same lines appear in the file, so matching
 * them gives the offset (`apple-clock.ts`). The cues are then moved onto the
 * player's clock as they load, so the transcript and the seek bar agree. The
 * player's own captions stay hidden.
 */

const TAG = 'libregaku';

/** Apple draws captions with the browser's own text tracks, so there is no DOM text to read. */
const NO_DOM_CAPTIONS = '[data-libregaku-no-dom-captions]';

/** Set once, so the rule that hides the player's captions is written once. */
const STYLE_ID = 'libregaku-apple-native';
// The picture is moved beside the transcript panel with a transform, which Apple's playback dialog
// counts as overflow and answers with a horizontal scrollbar: clipped while the rule is in force.
const NATIVE_RULE =
  ':root.libregaku-active video::cue { visibility: hidden !important; }\n' +
  ':root.libregaku-active dialog.playback-view { overflow-x: hidden !important; }';

const FETCH_TIMEOUT_MS = 15_000;
/** Segments fetched at once. A film is an hour of minute-long segments: one at a time is slow, all at once is rude. */
const PARALLEL = 6;
const MAX_CACHED = 16;
/** Time for the player to fill a showing text track, before reading it again. */
const FILL_WAIT_MS = 2500;
/** Tries before calibration is given up on. */
const CALIBRATE_TRIES = 4;

interface AppleTrack extends HlsRendition {
  id: string;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * The player. Apple TV plays a title in this dialog over whatever page it was started from: the
 * title's own page, and as often the home page's Continue Watching or a search, whose address
 * names no title and does not change while it plays.
 */
const PLAYBACK = 'dialog[data-testid="playback-view"][open]';
const SHOW = '[data-testid="player-metadata-title"]';
const EPISODE = '[data-testid="player-metadata-subtitle"]';

/** The open player. Every page keeps the dialog open and empty; it holds a <video> only while something plays. */
const playback = (): HTMLElement | null => {
  const view = document.querySelector<HTMLElement>(PLAYBACK);
  return view?.querySelector('video') ? view : null;
};

/** A title's page: /show/, /episode/ or /movie/, after the storefront where there is one. */
const TITLE_PAGE = /^https:\/\/tv\.apple\.com\/(?:[a-z]{2}(?:-[a-z0-9]+)?\/)?(?:show|episode|movie)\//i;

/** The title's id in its /episode/, /show/ or /movie/ path, or null anywhere else. */
export function titleIdOf(pathname: string): string | null {
  return /\/(?:episode|show|movie)\/[^/]+\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

/**
 * The asset a master playlist plays: its `a`, which names the episode, film or trailer, where the
 * page's address may name a show or nothing at all. Null for a playlist without one.
 */
export function assetOf(masterUrl: string): string | null {
  try {
    const a = new URL(masterUrl).searchParams.get('a');
    return a && /^\d+$/.test(a) ? a : null;
  } catch {
    return null;
  }
}

/** What the open player names: the show, then the season, episode and its name ("Silo · S3, E10 · Troy"); a film by its name. */
export function playingTitle(view: ParentNode & { getAttribute?(name: string): string | null }): string | null {
  const text = (sel: string): string => view.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const named = view.getAttribute?.('aria-label')?.trim() ?? '';
  const show = text(SHOW);
  const episode = text(EPISODE) || (named !== show ? named : '');
  return [show, episode].filter(Boolean).join(' · ') || null;
}

/**
 * What a card says it came from, out of the page's title. Apple writes
 * "Watch Chapter One - Pachinko (Season 1, Episode 1) - Apple TV", after a
 * left-to-right mark that is not seen and does not belong on a card.
 */
export function titleFrom(documentTitle: string): string | null {
  const named = documentTitle
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\s*[-–—|]\s*Apple TV\+?\s*$/i, '')
    .replace(/^\s*Watch\s+/i, '')
    .trim();
  return named && !/^Apple TV\+?$/i.test(named) ? named : null;
}

async function fetchText(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    throw new Error(`libregaku: ${ctl.signal.aborted ? ui.errors.noAnswerWithin(FETCH_TIMEOUT_MS / 1000) : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A language tag as the rest of the extension, and Apple's own player, write
 * it. The playlist names Mandarin by its own code (cmn-Hans, cmn-Hant) and
 * Tagalog and Norwegian by old ones (tl, no); the player's text tracks, and
 * every other site, say zh-Hans, zh-Hant, fil and nb. A tag the browser cannot
 * read is left as written.
 */
export function languageOf(tag: string): string {
  let canonical = tag;
  try {
    canonical = Intl.getCanonicalLocales(tag)[0] ?? tag;
  } catch {
    // Not a tag: nothing to rewrite.
  }
  // The browser keeps "no"; Apple's player lists its norsk as Bokmål.
  return canonical.replace(/^no(?=-|$)/, 'nb');
}

/** Renditions as tracks, with ids that survive a refreshed playlist: language, kind, and position among those. */
export function asTracks(renditions: HlsRendition[]): AppleTrack[] {
  const seen = new Map<string, number>();
  const out: AppleTrack[] = [];
  for (const r of renditions) {
    if (!isMediaUrl(r.uri)) continue;
    const language = languageOf(r.language);
    const key = `${language}:${r.forced ? 'forced' : r.cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    // The master lists each language once per CDN; the first is as good as the rest.
    if (n > 0) continue;
    out.push({ ...r, language, id: `${key}:${n}` });
  }
  return out;
}

/**
 * The player's text tracks that hold a rendition's lines: those of its
 * language, or, where the player writes the language some other way, those
 * under its name. Never a forced track, which holds only a few of the lines.
 */
export function nativeTracksFor<T extends Pick<TextTrack, 'kind' | 'language' | 'label'>>(
  track: Pick<HlsRendition, 'language' | 'name'>, all: T[],
): T[] {
  const full = all.filter((t) => t.kind === 'subtitles' && !/forced/i.test(t.label));
  const language = languageOf(track.language);
  const ofLanguage = full.filter((t) => languageOf(t.language) === language);
  if (ofLanguage.length) return ofLanguage;
  const name = track.name.trim();
  return name ? full.filter((t) => t.label.trim() === name) : [];
}

export class AppleAdapter implements SubtitleSource {
  readonly id = 'apple';
  readonly domCaptions = { container: NO_DOM_CAPTIONS, segment: NO_DOM_CAPTIONS, join: '\n' };
  // The whole player, controls included: the header bar and the transcript panel are drawn over
  // the picture and must sit above Apple's own controls, not beneath them.
  readonly playerRoot = ['.video-player', 'video'];

  #tracks: AppleTrack[] = [];
  /** Cues by rendition playlist URL, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  /** Matched pairs, keyed by file time, across every track of this title. */
  #pairs = new Map<string, Pair>();
  /** Player time minus file time, for this playback. Null until the player's captions have been read. */
  #offset: number | null = null;
  /** The text track the player is filling, and the file cues it is matched against. */
  #native: TextTrack | null = null;
  #file: Timed[] = [];
  #titleId: string | null = titleIdOf(location.pathname);
  /** Whether the player was open when last looked. */
  #playing = false;
  /** The asset of the last master playlist, which is what the player is playing. */
  #asset: string | null = null;
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // Apple TV is an SPA; the title changes without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the playlist before this script existed to hear about it.
    window.postMessage({ source: TAG, kind: 'apple-request-master' }, '*');
  }

  /**
   * A title's page, or any page while the player is open over it. Apple TV's other pages (the
   * home page, a search, a channel) play nothing until the player opens.
   */
  matches(url: string): boolean {
    if (!/^https:\/\/tv\.apple\.com\//i.test(url)) return false;
    return TITLE_PAGE.test(url) || playback() !== null;
  }

  /** The player's <video>, in the open player. A title's page may play its trailer in the background, in a shadow root. */
  video(): HTMLVideoElement | null {
    return playback()?.querySelector<HTMLVideoElement>('video') ?? document.querySelector<HTMLVideoElement>('video');
  }

  /** The episode or film playing; the title's page before anything has. */
  videoId(): string | null {
    return this.#asset ?? titleIdOf(location.pathname);
  }

  /** The show, and the episode, as the open player names them; else as the page's title does. */
  title(): string | null {
    const view = playback();
    return (view && playingTitle(view)) || titleFrom(document.title);
  }

  /** Apple TV has no link that opens a title at a moment, so the card has none. */
  deepLink(_seconds: number): string | null {
    return null;
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#tracks.map((t) => ({
      id: t.id,
      lang: t.language,
      label: t.name || t.language,
      ...(t.forced ? { forced: true } : {}),
      ...(t.cc ? { cc: true } : {}),
    }));
  }

  loadTrack(id: string): Promise<Cue[]> {
    const track = this.#tracks.find((t) => t.id === id);
    if (!track) return Promise.reject(new Error(`libregaku: no Apple TV subtitle track "${id}"`));
    const cached = this.#cues.get(track.uri);
    if (cached) return cached;
    const loading = this.#load(track);
    this.#cues.set(track.uri, loading);
    if (this.#cues.size > MAX_CACHED) {
      const oldest = this.#cues.keys().next().value;
      if (oldest !== undefined) this.#cues.delete(oldest);
    }
    // A failed load must not be the answer for the rest of the session: the token may have been refreshed.
    loading.catch(() => {
      if (this.#cues.get(track.uri) === loading) this.#cues.delete(track.uri);
    });
    return loading;
  }

  async #load(track: AppleTrack): Promise<Cue[]> {
    const playlist = await fetchText(track.uri);
    const urls = segmentUrls(playlist, track.uri).filter(isMediaUrl);
    if (!urls.length) throw new Error(`libregaku: ${ui.errors.emptyAnswer}`);

    const texts = new Array<string>(urls.length).fill('');
    let next = 0;
    const worker = async (): Promise<void> => {
      for (let i = next++; i < urls.length; i = next++) {
        texts[i] = await fetchText(urls[i] ?? '');
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, urls.length) }, worker));

    const cues = cuesFromSegments(texts);
    if (!cues.length) throw new Error(`libregaku: ${ui.errors.noCuesParsed}`);
    const offset = await this.#align(track, cues);
    // On the player's clock from here on: the transcript, the lines and the seek bar all read it.
    return cues.map((c) => ({ ...c, start: c.start + offset, end: c.end + offset }));
  }

  /**
   * The offset for this title, learned from the player's captions the first
   * time a track is loaded and kept after that. The player fills a text track
   * only while it is showing, so the track is switched on for a moment; the
   * rule in hideNative keeps it out of sight.
   */
  async #align(track: AppleTrack, cues: Cue[]): Promise<number> {
    if (this.#offset !== null) return this.#offset;
    this.#file = cues.map((c) => ({ text: c.text, start: c.start }));
    if (!(await this.#showTrack(track))) throw new Error(`libregaku: ${ui.notices.appleTiming}`);
    for (let i = 0; i < CALIBRATE_TRIES; i++) {
      if (i > 0) await wait(FILL_WAIT_MS);
      this.#learn();
      if (this.#offset !== null) return this.#offset;
    }
    throw new Error(`libregaku: ${ui.notices.appleTiming}`);
  }

  /** A text track of this rendition's language the player can fill, now showing. False when there is none. */
  async #showTrack(track: AppleTrack): Promise<boolean> {
    // The player fills no text track until the video has data; the tracks are listed well before that.
    let v = this.video();
    for (let waited = 0; (!v || v.readyState < 2) && waited < FILL_WAIT_MS * 12; waited += 500) {
      await wait(500);
      v = this.video();
    }
    if (!v || v.readyState < 2) return false;
    const candidates = nativeTracksFor(track, [...v.textTracks]);
    const filling = candidates.find((t) => t.mode === 'showing' && t.cues && t.cues.length);
    if (filling) {
      this.#native = filling;
      return true;
    }
    // The player lists each language more than once, and only one copy is filled: switch them all on, keep the one that fills.
    for (const t of candidates) t.mode = 'showing';
    // The player fills a track a moment after it is switched on, and sometimes only after it has played a while.
    for (let waited = 0; waited < FILL_WAIT_MS * 6; waited += 250) {
      await wait(250);
      const filled = candidates.find((t) => t.cues && t.cues.length);
      if (filled) {
        for (const t of candidates) if (t !== filled) t.mode = 'disabled';
        this.#native = filled;
        return true;
      }
    }
    for (const t of candidates) t.mode = 'disabled';
    return false;
  }

  /** Reads the cues the player has filled and fits the offset to the pairs they make. */
  #learn(): void {
    const native = this.#native;
    if (!native || !this.#file.length || !native.cues) return;
    const shown: Timed[] = [...native.cues].map((c) => ({ text: (c as VTTCue).text, start: c.startTime }));
    for (const p of pairsFrom(shown, this.#file, null)) this.#pairs.set(p.file.toFixed(3), p);
    this.#offset = fitOffset([...this.#pairs.values()]);
    if (this.#offset !== null) console.debug(`[libregaku] apple tv captions run ${this.#offset.toFixed(3)} s behind the file, from ${this.#pairs.size} lines`);
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = NATIVE_RULE;
      document.head.appendChild(style);
    }
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }

  /** The page, or the player over it, changed. Every adapter is made on every site, so it looks only on Apple TV. */
  #syncUrl(): void {
    if (location.hostname !== 'tv.apple.com') return;
    const id = titleIdOf(location.pathname);
    const playing = playback() !== null;
    if (id === this.#titleId && playing === this.#playing) return;
    const moved = id !== this.#titleId;
    this.#titleId = id;
    this.#playing = playing;
    // Another title's page: its tracks and clock are its own. The player opening or closing over
    // a page keeps them, since the playlist it fetched may already be here; another asset in the
    // player is another title (#onMessage).
    if (moved) {
      this.#tracks = [];
      this.#asset = null;
      this.#forget();
    }
    this.#navCbs.forEach((cb) => cb());
  }

  /** The clock belongs to the title it was learned on. */
  #forget(): void {
    this.#cues.clear();
    this.#pairs.clear();
    this.#offset = null;
    this.#native = null;
    this.#file = [];
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Apple TV; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG || m.kind !== 'apple-master') return;
    // The page is not trusted — any script on it can post this — so the playlist must be Apple-hosted.
    if (typeof m.url !== 'string' || typeof m.text !== 'string' || !isMediaUrl(m.url)) return;

    const tracks = asTracks(subtitleRenditions(m.text, m.url));
    if (!tracks.length) return;
    const asset = assetOf(m.url);
    // Another asset under the same address: the next episode in the open player, or the title
    // played after its page's trailer. Its tracks and clock are its own.
    if (asset && this.#asset && asset !== this.#asset) {
      this.#asset = asset;
      this.#tracks = tracks;
      this.#forget();
      this.#navCbs.forEach((cb) => cb());
      this.#trackCbs.forEach((cb) => cb());
      return;
    }
    if (asset) this.#asset = asset;
    const same = tracks.length === this.#tracks.length && tracks.every((t, i) => t.uri === this.#tracks[i]?.uri);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
