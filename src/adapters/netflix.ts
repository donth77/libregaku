import { parseTtml } from './ttml';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Netflix. The track list arrives inside the player manifest, which
 * `inject-netflix.ts` captures by hooking `JSON.parse`.
 *
 * Manifests arrive for more than the title on screen: the player prepares the
 * next episode's while this one is still playing, and previews parse their
 * own. So lists are kept per movieId and served for the id in the /watch/ URL.
 * Serving "the last manifest seen" put the next episode's subtitles over the
 * end of this one — and clearing on every path change then left the next
 * episode with no list at all, because its manifest had already come and gone.
 *
 * Unlike YouTube, the subtitle URLs Netflix hands out are directly fetchable —
 * no signing dance. The DOM fallback is still declared, because M0 established
 * that assuming a fetch will succeed is how this breaks silently.
 */

const TAG = 'libregaku';

/** Where Netflix serves subtitle files. A URL anywhere else did not come from its manifest. */
const SUBTITLE_HOST = /(^|\.)nflxvideo\.net$/;

/** Plenty for a session of previews and next episodes; the least recent go first. */
const MAX_LISTS = 32;
const MAX_CACHED_URLS = 64;

/** A CDN that hangs must not stop the next one from being tried. */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * How long the page hook has to answer a seek before we move the <video>
 * ourselves. Generous on purpose: an answer arriving after the fallback fired
 * means two seeks, and the second is the kind Netflix answers with M7375. The
 * wait only costs anything when the hook is missing altogether.
 */
const SEEK_ACK_MS = 1000;

/** How long to wait for this title's manifest before saying it may never come. */
const MISSING_LIST_WARN_MS = 10_000;

interface NfTrack {
  /**
   * Language, kind, and position among tracks sharing both. Stable across a
   * refreshed manifest, where a list index is not: a manifest landing between
   * listing tracks and loading one must not turn "track 3" into another one.
   */
  id: string;
  urls: string[];
  language: string;
  label: string;
  forced: boolean;
  cc: boolean;
}

/** The id in a /watch/<id> path, or null anywhere else. */
export function watchIdOf(pathname: string): string | null {
  return /\/watch\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

const warned = new Set<string>();

function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[libregaku] ' + msg);
}

function isSubtitleUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false;
  try {
    const url = new URL(u);
    if (url.protocol === 'https:' && SUBTITLE_HOST.test(url.hostname)) return true;
    warnOnce(
      'host:' + url.host,
      `ignoring a Netflix subtitle URL on ${url.protocol}//${url.host}. If Netflix has moved ` +
        'its subtitle CDN, SUBTITLE_HOST in src/adapters/netflix.ts needs the new host.',
    );
  } catch {
    /* not a URL at all */
  }
  return false;
}

/**
 * Tracks from a page message. The page is not trusted — any script on it can
 * post one — so only well-formed entries with Netflix-hosted https URLs count.
 */
function readTracks(raw: unknown): NfTrack[] {
  if (!Array.isArray(raw)) return [];
  const out: NfTrack[] = [];
  const seen = new Map<string, number>();
  for (const entry of raw as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const r = entry as Record<string, unknown>;
    const listed: unknown[] = Array.isArray(r.urls) ? (r.urls as unknown[]) : [r.url];
    const urls = [...new Set(listed.filter(isSubtitleUrl))];
    if (!urls.length) continue;

    const language = typeof r.language === 'string' ? r.language : '';
    const forced = r.forced === true;
    const cc = r.cc === true;
    const key = `${language}:${forced ? 'forced' : cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);

    out.push({
      id: `${key}:${n}`,
      urls,
      language,
      label: typeof r.label === 'string' && r.label ? r.label : language,
      forced,
      cc,
    });
  }
  return out;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** A URL's body, or why not. The timeout covers the body too, so a stalled stream cannot hang the chain. */
async function fetchText(url: string): Promise<{ body: string } | { why: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return { why: `HTTP ${res.status}` };
    return { body: (await res.text()).trim() };
  } catch (e) {
    return { why: ctl.signal.aborted ? `no answer in ${FETCH_TIMEOUT_MS / 1000}s` : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every URL in turn until one yields cues. Netflix lists several CDNs — and
 * several encodings — per track, and any one of them can be down or expired.
 */
async function fetchCues(urls: string[]): Promise<Cue[]> {
  const tried: string[] = [];
  for (const url of urls) {
    const got = await fetchText(url);
    if ('why' in got) {
      tried.push(`${hostOf(url)}: ${got.why}`);
      continue;
    }
    if (!got.body) {
      tried.push(`${hostOf(url)}: empty`);
      continue;
    }
    // Netflix serves imsc1 TTML; WebVTT shows up on some titles.
    const cues = got.body.startsWith('WEBVTT') ? parseVtt(got.body) : parseTtml(got.body);
    if (cues.length) return cues;
    tried.push(`${hostOf(url)}: parsed to zero cues`);
  }
  throw new Error(`libregaku: no subtitle URL worked — ${tried.join('; ') || 'none listed'}`);
}

export class NetflixAdapter implements SubtitleSource {
  readonly id = 'netflix';
  readonly domCaptions = {
    container: '.player-timedtext',
    segment: '.player-timedtext-text-container',
    join: '\n',
  };
  readonly playerRoot = ['.watch-video--player-view', '.watch-video', '[data-uia="video-canvas"]'];

  /** Track lists by movieId, least recently received first. Never cleared by navigation. */
  #lists = new Map<string, NfTrack[]>();
  /** The last list received, for a page whose URL carries no /watch/ id. */
  #latest: { movieId: string | null; tracks: NfTrack[] } | null = null;
  /** The /watch/ id navigation was last reported for, and since when. */
  #watchId: string | null = watchIdOf(location.pathname);
  #watchSince = Date.now();
  /** Cues by subtitle URL, in flight or done, so two loads of one track share a fetch. */
  #cues = new Map<string, Promise<Cue[]>>();
  #seekToken = 0;
  #pendingSeek = 0;
  /** Episode titles by /watch/ id, read while the title bar was showing. */
  #titles = new Map<string, string>();
  /** The control bar's last measured height; it is absent while hidden. */
  #controls = 0;
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));

    // Netflix is an SPA; the watch id changes without a page load.
    setInterval(() => this.#syncUrl(), 500);

    // The page hook may have parsed this title's manifest before this script
    // existed to hear about it. Ask it to say again.
    window.postMessage({ source: TAG, kind: 'nf-request-tracks' }, '*');
  }

  matches(url: string): boolean {
    return /^https:\/\/(www\.)?netflix\.com\/watch\//.test(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  videoId(): string | null {
    return watchIdOf(location.pathname) ?? this.#latest?.movieId ?? null;
  }

  /**
   * The show and episode, as the player's title bar spells them.
   *
   * That bar only exists while the controls are showing, and the document
   * title is just "Netflix" — which is what cards and saved lines used to be
   * named. So the title is read whenever the bar is there (the URL poll looks
   * too) and remembered for the episode.
   */
  title(): string | null {
    this.#readTitle();
    const id = watchIdOf(location.pathname);
    return (id && this.#titles.get(id)) || null;
  }

  #readTitle(): void {
    const el = document.querySelector('[data-uia="video-title"], .video-title');
    const id = watchIdOf(location.pathname);
    if (!el || !id) return;
    // <h4>Show</h4><span>E1</span><span>Episode name</span>: the parts, not
    // their textContent run together ("ShowE1Episode name").
    const parts = [...el.children].map((c) => c.textContent?.trim() ?? '').filter(Boolean);
    const text = (parts.length ? parts.join(' · ') : el.textContent?.trim()) ?? '';
    if (text) this.#titles.set(id, text);
  }

  /** Netflix watch URLs accept a `t` parameter in seconds. */
  deepLink(seconds: number): string | null {
    const id = watchIdOf(location.pathname);
    return id ? `https://www.netflix.com/watch/${id}?t=${Math.floor(seconds)}` : null;
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
  }

  /**
   * Netflix answers a scripted change to its <video>'s currentTime with error
   * M7375, so the page hook seeks through the player's own API. If the hook
   * never answers — it was blocked, or it predates this version — setting
   * currentTime is all that is left, and that is said out loud because it may
   * fail.
   */
  seek(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const token = ++this.#seekToken;
    this.#pendingSeek = token;
    window.postMessage({ source: TAG, kind: 'nf-seek', ms: Math.round(seconds * 1000), token }, '*');

    setTimeout(() => {
      if (this.#pendingSeek !== token) return; // answered, or overtaken by a newer seek
      this.#pendingSeek = 0;
      console.warn(
        '[libregaku] the Netflix page hook did not answer a seek — setting currentTime directly, ' +
          'which Netflix may refuse with error M7375',
      );
      const v = this.video();
      if (v) v.currentTime = seconds;
    }, SEEK_ACK_MS);
  }

  /**
   * From the top of the control bar to the bottom of the player.
   *
   * Netflix removes the bar from the page while its controls are hidden, so it
   * is measured whenever it is there and the height remembered; the panel
   * then stops above it for good, as it does on YouTube. Checked live
   * (nf.controls): without this the panel covered episodes, audio and
   * subtitles, speed and fullscreen. A reading of half the player or more is
   * not a control bar and is ignored.
   */
  controlsHeight(): number {
    const bar = document.querySelector<HTMLElement>('[data-uia="controls-standard"]');
    const root = document.querySelector<HTMLElement>(this.playerRoot[0] ?? '');
    if (bar && root) {
      const r = root.getBoundingClientRect();
      const h = Math.round(r.bottom - bar.getBoundingClientRect().top);
      if (h > 0 && h < r.height / 2) this.#controls = h;
    }
    return this.#controls;
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#current().map((t) => ({
      id: t.id,
      lang: t.language,
      label: t.label + (t.forced ? ' (forced)' : ''),
      generated: false,
      forced: t.forced,
      cc: t.cc,
    }));
  }

  async loadTrack(id: string): Promise<Cue[]> {
    const track = this.#current().find((t) => t.id === id);
    if (!track) throw new Error('libregaku: unknown track ' + id);

    const cached = track.urls.map((u) => this.#cues.get(u)).find((p) => p !== undefined);
    const cues = await (cached ?? this.#fetch(track.urls));
    return cues.slice();
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Netflix; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG) return;

    if (m.kind === 'nf-tracks') this.#receive(m.tracks, m.movieId);
    else if (m.kind === 'nf-seek-done' && m.token === this.#pendingSeek) this.#pendingSeek = 0;
  }

  #receive(rawTracks: unknown, rawId: unknown): void {
    const tracks = readTracks(rawTracks);
    if (!tracks.length) return;
    const movieId = typeof rawId === 'string' && /^[\w-]{1,64}$/.test(rawId) ? rawId : null;

    // A manifest can land before the poll notices the URL moved, and must be
    // judged against the page as it is now.
    this.#syncUrl();

    if (movieId) {
      this.#store(movieId, tracks);
    } else if (this.#watchId && !this.#lists.has(this.#watchId)) {
      // Nothing to file it under but the page it arrived on — and never over
      // a list that does carry the right id.
      warnOnce('no-movie-id', 'a Netflix manifest carried no movieId; filing its tracks under the title on screen');
      this.#store(this.#watchId, tracks);
    }
    this.#latest = { movieId, tracks };

    const forId = movieId ?? this.#watchId;
    if (!this.#watchId || forId === this.#watchId) {
      this.#trackCbs.forEach((cb) => cb());
    } else {
      console.debug(`[libregaku] netflix: kept tracks for ${forId} until it plays (on screen: ${this.#watchId})`);
    }
  }

  #store(movieId: string, tracks: NfTrack[]): void {
    this.#lists.delete(movieId); // re-inserted last, so eviction takes the least recent
    this.#lists.set(movieId, tracks);
    for (const id of this.#lists.keys()) {
      if (this.#lists.size <= MAX_LISTS) break;
      if (id !== this.#watchId) this.#lists.delete(id);
    }
  }

  /** Report navigation when — and only when — the /watch/ id changes. */
  #syncUrl(): void {
    this.#readTitle();
    const id = watchIdOf(location.pathname);
    if (id === this.#watchId) return;
    this.#watchId = id;
    this.#watchSince = Date.now();
    this.#navCbs.forEach((cb) => cb());
  }

  /** The tracks of the title on screen. */
  #current(): NfTrack[] {
    const id = watchIdOf(location.pathname);
    if (!id) return this.#latest?.tracks ?? [];
    const list = this.#lists.get(id);
    if (list) return list;
    if (this.#lists.size && Date.now() - this.#watchSince > MISSING_LIST_WARN_MS) {
      warnOnce(
        'missing:' + id,
        `no Netflix manifest for /watch/${id}, though there are for ${[...this.#lists.keys()].join(', ')}. ` +
          "If this persists, the manifest's movieId no longer matches the watch URL.",
      );
    }
    return [];
  }

  #fetch(urls: string[]): Promise<Cue[]> {
    const load = fetchCues(urls);
    for (const u of urls) this.#cues.set(u, load);
    // Never keep a failure: the next attempt may find a CDN that answers.
    load.catch(() => {
      for (const u of urls) if (this.#cues.get(u) === load) this.#cues.delete(u);
    });
    for (const u of this.#cues.keys()) {
      if (this.#cues.size <= MAX_CACHED_URLS) break;
      this.#cues.delete(u);
    }
    return load;
  }
}

/** Named entities WebVTT files use. Direction marks carry no text. */
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lrm: '', rlm: '',
};

/** Invisible direction controls, which would otherwise sit inside a word. */
const BIDI = /[‎‏‪-‮⁦-⁩]/g;

/**
 * A cue's text as shown: ruby readings dropped (the base is the line), every
 * other tag removed — <c.japanese>, <i>, <v Speaker>, <lang>, timestamps — and
 * entities decoded last, so an escaped "&lt;i&gt;" survives as text.
 */
function vttText(raw: string): string {
  return raw
    .replace(/<rt\b[^>]*>[\s\S]*?(?:<\/rt>|(?=<\/ruby>)|$)/gi, '')
    .replace(/<rp\b[^>]*>[\s\S]*?(?:<\/rp>|$)/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m: string, e: string) => {
      if (!e.startsWith('#')) return ENTITIES[e.toLowerCase()] ?? m;
      const cp = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isInteger(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    })
    .replace(BIDI, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function parseVtt(vtt: string): Cue[] {
  const clock = (v: string): number => {
    const p = v.trim().replace(',', '.').split(':').map(Number);
    if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
    if (p.length === 2) return (p[0] ?? 0) * 60 + (p[1] ?? 0);
    return Number(v) || 0;
  };

  const cues: Cue[] = [];
  for (const block of vtt.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const idx = lines.findIndex((l) => l.includes('-->'));
    if (idx < 0) continue;
    const [from, to] = (lines[idx] ?? '').split('-->');
    const text = vttText(lines.slice(idx + 1).join('\n'));
    if (!text || !from || !to) continue;
    cues.push({ start: clock(from), end: clock(to.trim().split(/\s+/)[0] ?? ''), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
