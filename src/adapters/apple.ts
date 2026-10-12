import { ui } from '../i18n';
import { fitClock, pairsFrom, type Clock, type Pair, type Timed } from './apple-clock';
import { cuesFromSegments, segmentUrls, subtitleRenditions, type HlsRendition } from './hls';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Apple TV+. The player plays HLS: the master playlist lists each subtitle
 * track as a rendition, and a rendition is a playlist of WebVTT segments, one
 * minute long each. `inject-apple.ts` passes on the master playlist the player
 * itself fetched, and every rendition and segment URL resolves against it.
 *
 * The files' cue times are not on the <video>'s clock. The offset is about a
 * minute and it drifts a little over a film, so the adapter learns the clock
 * from the player: the browser fills a text track's cues once it is showing,
 * and the same lines appear in the file, so matching them gives the line
 * `apple-clock.ts` fits. The player's own captions stay hidden.
 */

const TAG = 'libregaku';

/** Where Apple serves playlists and segments. A URL anywhere else did not come from its player. */
const MEDIA_HOST = /(^|\.)(tv|itunes)\.apple\.com$/;

/** Apple draws captions with the browser's own text tracks, so there is no DOM text to read. */
const NO_DOM_CAPTIONS = '[data-libregaku-no-dom-captions]';

/** Set once, so the rule that hides the player's captions is written once. */
const STYLE_ID = 'libregaku-apple-native';
const NATIVE_RULE = ':root.libregaku-active video::cue { visibility: hidden !important; }';

const FETCH_TIMEOUT_MS = 15_000;
/** Segments fetched at once. A film is an hour of minute-long segments: one at a time is slow, all at once is rude. */
const PARALLEL = 6;
const MAX_CACHED = 16;
/** Time for the player to fill a showing text track, and how often to read it again while playing. */
const FILL_WAIT_MS = 2500;
const LEARN_EVERY_MS = 3000;
/** Tries before calibration is given up on. */
const CALIBRATE_TRIES = 4;

interface AppleTrack extends HlsRendition {
  id: string;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function isMediaUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && MEDIA_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/** The title's id in its /episode/, /show/ or /movie/ path, or null anywhere else. */
export function titleIdOf(pathname: string): string | null {
  return /\/(?:episode|show|movie)\/[^/]+\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
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

/** Renditions as tracks, with ids that survive a refreshed playlist: language, kind, and position among those. */
function asTracks(renditions: HlsRendition[]): AppleTrack[] {
  const seen = new Map<string, number>();
  const out: AppleTrack[] = [];
  for (const r of renditions) {
    if (!isMediaUrl(r.uri)) continue;
    const key = `${r.language}:${r.forced ? 'forced' : r.cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    // The master lists each language once per CDN; the first is as good as the rest.
    if (n > 0) continue;
    out.push({ ...r, id: `${key}:${n}` });
  }
  return out;
}

export class AppleAdapter implements SubtitleSource {
  readonly id = 'apple';
  readonly domCaptions = { container: NO_DOM_CAPTIONS, segment: NO_DOM_CAPTIONS, join: '\n' };
  readonly playerRoot = ['.video-player__video-container', 'video'];

  #tracks: AppleTrack[] = [];
  /** Cues by rendition playlist URL, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  /** Matched pairs, keyed by file time, across every track of this title. */
  #pairs = new Map<string, Pair>();
  #clock: Clock | null = null;
  /** The text track the player is filling, and the file cues it is matched against. */
  #native: TextTrack | null = null;
  #file: Timed[] = [];
  #learner: ReturnType<typeof setInterval> | undefined;
  #titleId: string | null = titleIdOf(location.pathname);
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // Apple TV+ is an SPA; the title changes without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the playlist before this script existed to hear about it.
    window.postMessage({ source: TAG, kind: 'apple-request-master' }, '*');
  }

  /** A title's page, or its player. Apple TV+ also has pages of other kinds that play nothing. */
  matches(url: string): boolean {
    return /^https:\/\/tv\.apple\.com\/[a-z]{2}(?:-[a-z0-9]+)?\/(?:show|episode|movie)\//i.test(url);
  }

  /** The player's <video>. The page has one. */
  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  videoId(): string | null {
    return titleIdOf(location.pathname);
  }

  /** The show, and the episode where the page names one. */
  title(): string | null {
    const named = document.title.replace(/\s*-\s*Apple TV\s*$/i, '').replace(/^Watch\s+/i, '').trim();
    return named || null;
  }

  /** Apple TV+ has no link that opens a title at a moment, so the card has none. */
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
    if (!track) return Promise.reject(new Error(`libregaku: no Apple TV+ subtitle track "${id}"`));
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
    await this.#align(track.language, cues);
    return cues;
  }

  /**
   * Finds the clock the player keeps for this title, so the file's cues can
   * be placed. The player fills a text track only while it is showing, so the
   * track is switched on for a moment and then hidden by the rule below.
   */
  async #align(lang: string, cues: Cue[]): Promise<void> {
    this.#file = cues.map((c) => ({ text: c.text, start: c.start }));
    const ready = await this.#showTrack(lang);
    if (!ready && !this.#clock) throw new Error(`libregaku: ${ui.notices.appleTiming}`);
    this.#learn();
    for (let i = 1; !this.#clock && i < CALIBRATE_TRIES; i++) {
      await wait(FILL_WAIT_MS);
      this.#learn();
    }
    if (!this.#clock) throw new Error(`libregaku: ${ui.notices.appleTiming}`);
    if (!this.#learner) this.#learner = setInterval(() => this.#learn(), LEARN_EVERY_MS);
  }

  /** A text track of this language the player can fill, now showing. False when there is none. */
  async #showTrack(lang: string): Promise<boolean> {
    // The player fills no text track until the video has data; the tracks are listed well before that.
    let v = this.video();
    for (let waited = 0; (!v || v.readyState < 2) && waited < FILL_WAIT_MS * 12; waited += 500) {
      await wait(500);
      v = this.video();
    }
    if (!v || v.readyState < 2) return false;
    const candidates = [...v.textTracks].filter(
      (t) => t.kind === 'subtitles' && t.language === lang && !/forced/i.test(t.label),
    );
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

  /** Reads the cues the player has filled and extends the clock with the pairs they make. */
  #learn(): void {
    const native = this.#native;
    if (!native || !this.#file.length) return;
    const shown: Timed[] = native.cues
      ? [...native.cues].map((c) => ({ text: (c as VTTCue).text, start: c.startTime }))
      : [];
    if (!shown.length) return;
    for (const p of pairsFrom(shown, this.#file, this.#clock)) this.#pairs.set(p.file.toFixed(3), p);
    const fitted = fitClock([...this.#pairs.values()]);
    if (fitted) this.#clock = fitted;
  }

  /**
   * Where playback is on the clock the file's cue times are on. Before a clock
   * is known the element's own time stands in, which is only right for a title
   * that starts at zero.
   */
  time(): number | null {
    const v = this.video();
    if (!v) return null;
    const c = this.#clock;
    return c ? (v.currentTime - c.b) / c.a : v.currentTime;
  }

  /** Through the player's clock, so a jump lands on the line asked for. */
  seek(seconds: number): void {
    const v = this.video();
    if (!v || !Number.isFinite(seconds) || seconds < 0) return;
    const c = this.#clock;
    v.currentTime = c ? c.a * seconds + c.b : seconds;
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

  #syncUrl(): void {
    const id = titleIdOf(location.pathname);
    if (id === this.#titleId) return;
    this.#titleId = id;
    // The clock belongs to the title it was learned on.
    this.#tracks = [];
    this.#cues.clear();
    this.#pairs.clear();
    this.#clock = null;
    this.#native = null;
    this.#file = [];
    if (this.#learner) clearInterval(this.#learner);
    this.#learner = undefined;
    this.#navCbs.forEach((cb) => cb());
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Apple TV+; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG || m.kind !== 'apple-master') return;
    // The page is not trusted — any script on it can post this — so the playlist must be Apple-hosted.
    if (typeof m.url !== 'string' || typeof m.text !== 'string' || !isMediaUrl(m.url)) return;

    const tracks = asTracks(subtitleRenditions(m.text, m.url));
    if (!tracks.length) return;
    const same = tracks.length === this.#tracks.length && tracks.every((t, i) => t.uri === this.#tracks[i]?.uri);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
