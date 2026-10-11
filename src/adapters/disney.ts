import { ui } from '../i18n';
import { segmentUrls, subtitleRenditions, cuesFromSegments, type HlsRendition } from './hls';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Disney+. It plays HLS: the master playlist lists each subtitle track as a
 * rendition, and a rendition is a playlist of WebVTT segments.
 * `inject-disney.ts` passes on the master playlist the player itself fetched,
 * whose URL carries a signed token in its path; every rendition and segment
 * URL is relative to it, so resolving them keeps the token and nothing is
 * built by hand.
 *
 * The playlist does not name its title, so the list served is the last one
 * the page fetched. A next episode's playlist arriving early would be served
 * for the end of this one — the same hazard Netflix had, without the id that
 * solved it there.
 */

const TAG = 'libregaku';

/** Where Disney+ serves playlists and segments. A URL anywhere else did not come from its player. */
const MEDIA_HOST = /(^|\.)(dssott\.com|dssedge\.com|bamgrid\.com)$/;

/** The component the player draws its own subtitles in, and their box inside it. */
const NATIVE_HOST = 'timed-text-override-region';
const NATIVE_WRAPPER = '.hive-subtitle-renderer-wrapper';

const FETCH_TIMEOUT_MS = 15_000;
/** Segments fetched at once. A film is a few dozen; one at a time is slow, all at once is rude. */
const PARALLEL = 6;
const MAX_CACHED = 16;

function isMediaUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && MEDIA_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

/** The id in a /play/<id> path (/video/<id> on older pages), or null anywhere else. */
export function playIdOf(pathname: string): string | null {
  return /\/(?:play|video)\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

async function fetchText(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    throw new Error(ctl.signal.aborted ? ui.errors.noAnswerWithin(FETCH_TIMEOUT_MS / 1000) : String(e));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The segments that carry the programme. Disney+ puts a short card before
 * some titles — a different folder in the same playlist — and marks the
 * programme's own segments "-MAIN/". Where that mark is present, only those
 * count; where it is not, every segment does.
 */
export function programmeSegments(urls: string[]): string[] {
  const main = urls.filter((u) => /-MAIN\//.test(u));
  return main.length ? main : urls;
}

export { cuesFromSegments } from './hls';

interface DpTrack extends HlsRendition {
  id: string;
}

/** Renditions as tracks, with ids that survive a refreshed playlist: language, kind, and position among those. */
function asTracks(renditions: HlsRendition[]): DpTrack[] {
  const seen = new Map<string, number>();
  const out: DpTrack[] = [];
  for (const r of renditions) {
    if (!isMediaUrl(r.uri)) continue;
    const key = `${r.language}:${r.forced ? 'forced' : r.cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.push({ ...r, id: `${key}:${n}` });
  }
  return out;
}

export class DisneyAdapter implements SubtitleSource {
  readonly id = 'disney';
  // Inside <timed-text-override-region>'s shadow root, so a document query does not find them:
  // the DOM-reading fallback does not work on Disney+ (dp.caption-dom).
  readonly domCaptions = {
    container: NATIVE_WRAPPER,
    segment: '.hive-subtitle-renderer-cue',
    join: '\n',
  };
  readonly playerRoot = [
    '[data-testid="disney-web-player-wrapper"]',
    '[data-testid="disney-web-player-container"]',
    '[data-testid="playback-view"]',
    'disney-web-player',
  ];

  #tracks: DpTrack[] = [];
  /** Cues by rendition playlist URL, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  #playId: string | null = playIdOf(location.pathname);
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];
  /** Programme time minus the <video>'s, as the page hook last reported it. Null until it has. */
  #clockOffset: number | null = null;
  #styler: ReturnType<typeof setInterval> | undefined;

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // Disney+ is an SPA; the play id changes without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the playlist before this script existed to hear about it.
    window.postMessage({ source: TAG, kind: 'dp-request-master' }, '*');
  }

  matches(url: string): boolean {
    return /^https:\/\/(www\.)?disneyplus\.com\/([a-z]{2}(-[a-z0-9]+)?\/)?(play|video)\//i.test(url);
  }

  /** The largest <video>: the page can hold a second, hidden one. */
  video(): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let area = -1;
    for (const v of Array.from(document.querySelectorAll<HTMLVideoElement>('video'))) {
      const a = v.clientWidth * v.clientHeight;
      if (a > area) {
        best = v;
        area = a;
      }
    }
    return best;
  }

  videoId(): string | null {
    return playIdOf(location.pathname);
  }

  title(): string | null {
    const named = document.querySelector('[data-testid="player-metadata-title"], [data-testid="playback-title"]');
    const text = named?.textContent?.trim() || document.title.replace(/\s*\|\s*Disney\+\s*$/i, '').trim();
    return text && !/^Disney\+$/i.test(text) ? text : null;
  }

  /** The play page. Disney+ has no documented way to open one at a moment, so the card links to the title. */
  deepLink(_seconds: number): string | null {
    const id = playIdOf(location.pathname);
    return id ? `https://www.disneyplus.com/play/${id}` : null;
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
    if (!track) return Promise.reject(new Error(`libregaku: no Disney+ subtitle track "${id}"`));
    const cached = this.#cues.get(track.uri);
    if (cached) return cached;
    const loading = this.#load(track.uri);
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

  async #load(playlistUrl: string): Promise<Cue[]> {
    const playlist = await fetchText(playlistUrl);
    const urls = programmeSegments(segmentUrls(playlist, playlistUrl)).filter(isMediaUrl);
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
    return cues;
  }

  /**
   * Hide the player's own subtitles. They are drawn inside a component
   * (<timed-text-override-region>), where the page's stylesheet — and so
   * subs.css — does not reach, so the rule goes into that component's own
   * root. It applies only while the document is marked active, so turning
   * the extension off brings them back.
   */
  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
    this.#styleNative();
    if (!this.#styler) this.#styler = setInterval(() => this.#styleNative(), 1000);
  }

  /** The player builds its components late, and again for the next title: keep the rule in each. */
  #styleNative(): void {
    const visit = (root: ParentNode, depth: number): void => {
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
        const inner = el.shadowRoot;
        if (!inner) continue;
        if (el.localName === NATIVE_HOST && !inner.querySelector('style[data-libregaku]')) {
          const style = document.createElement('style');
          style.dataset.libregaku = '';
          style.textContent = `:host-context(.libregaku-active) ${NATIVE_WRAPPER} { display: none !important; }`;
          inner.appendChild(style);
        }
        if (depth < 6) visit(inner, depth + 1);
      }
    };
    visit(document, 0);
  }

  /**
   * Where playback is in the programme. The <video>'s own clock is not that:
   * it starts from wherever this session began and starts again after a seek
   * (dp.clock). The page hook reports the player's position beside the
   * element's time; their difference holds between reports, so the element's
   * time carries it forward each frame.
   */
  time(): number | null {
    const video = this.video();
    if (!video || this.#clockOffset === null) return null;
    return video.currentTime + this.#clockOffset;
  }

  /** Through the player, which takes programme time; setting currentTime would mean the element's clock. */
  seek(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    window.postMessage({ source: TAG, kind: 'dp-seek', ms: Math.round(seconds * 1000) }, '*');
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }

  #syncUrl(): void {
    const id = playIdOf(location.pathname);
    if (id === this.#playId) return;
    this.#playId = id;
    this.#navCbs.forEach((cb) => cb());
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Disney+; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG) return;
    if (m.kind === 'dp-clock') {
      if (typeof m.offset === 'number' && Number.isFinite(m.offset)) this.#clockOffset = m.offset;
      return;
    }
    if (m.kind !== 'dp-master') return;
    // The page is not trusted — any script on it can post this — so the playlist must be Disney-hosted.
    if (typeof m.url !== 'string' || typeof m.text !== 'string' || !isMediaUrl(m.url)) return;

    const tracks = asTracks(subtitleRenditions(m.text, m.url));
    if (!tracks.length) return;
    const same =
      tracks.length === this.#tracks.length && tracks.every((t, i) => t.uri === this.#tracks[i]?.uri);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
