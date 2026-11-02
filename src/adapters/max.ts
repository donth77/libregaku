import { ui } from '../i18n';
import { textTracks, type DashTrack } from './dash';
import { cuesFromSegments } from './hls';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * HBO Max. It plays DASH: the manifest lists each subtitle track as a
 * text AdaptationSet whose segments are numbered WebVTT files, with cue times
 * already on the programme's clock. `inject-max.ts` passes on the manifest
 * the player itself fetched, whose URL is signed; every segment URL is
 * relative to it, so resolving them builds nothing by hand.
 *
 * The manifest does not name its title, so the list served is the last one
 * the page fetched. A next episode's arriving early would be served for the
 * end of this one.
 */

const TAG = 'libregaku';

/** Where HBO Max serves its manifests and segments. A URL anywhere else did not come from its player. */
const MEDIA_HOST = /(^|\.)h264\.io$/;

const FETCH_TIMEOUT_MS = 15_000;
/** Segments fetched at once. A film has a handful per track; this is for a long one. */
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

/** The id in a /video/watch/<id> path, or null anywhere else. */
export function watchIdOf(pathname: string): string | null {
  return /\/video\/watch\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

/**
 * A watch page, on either host the player has been served from (mx.address):
 * play.hbomax.com until 30 October 2026, when it began sending every path to
 * the same one on www.hbomax.com.
 */
export function isWatchPage(url: string): boolean {
  return /^https:\/\/(play|www)\.hbomax\.com\/video\/watch\//.test(url);
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

interface MxTrack extends DashTrack {
  id: string;
  forced: boolean;
  cc: boolean;
}

/** Tracks with ids that survive a refreshed manifest: language, kind, and position among those. */
export function asTracks(tracks: DashTrack[]): MxTrack[] {
  const seen = new Map<string, number>();
  const out: MxTrack[] = [];
  for (const t of tracks) {
    const forced = /forced/i.test(t.role);
    const cc = /caption/i.test(t.role);
    if (!t.urls.every(isMediaUrl)) continue;
    const key = `${t.language}:${forced ? 'forced' : cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.push({ ...t, id: `${key}:${n}`, forced, cc });
  }
  return out;
}

export class MaxAdapter implements SubtitleSource {
  readonly id = 'max';
  // HBO Max's class names are generated ("CaptionWindow-Fuse-Web-Play__sc-1wvp621-5"); the part before "__" is the component's.
  readonly domCaptions = {
    container: '[class*="CaptionWindow-Fuse-Web-Play"]',
    segment: '[class*="TextCue-Fuse-Web-Play"]',
    join: '\n',
  };
  // The video's parent holds the picture and the control layer at the player's real size.
  // #layer-root-player-screen above it is zero tall (its children overflow it), so it cannot be the root:
  // the picture was centred in a box with no height and fell off the top.
  readonly playerRoot = [
    '[class*="PlayerRootContainer-Fuse-Web-Play"]',
    '[class*="StyledPlayerShrinkTransitionContainer-Fuse-Web-Play"]',
    '#layer-root-player-screen',
  ];

  #tracks: MxTrack[] = [];
  /** Cues by track id and its first segment's URL, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  #watchId: string | null = watchIdOf(location.pathname);
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // HBO Max is an SPA; the title changes without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the manifest before this script existed to hear about it.
    window.postMessage({ source: TAG, kind: 'mx-request-mpd' }, '*');
  }

  matches(url: string): boolean {
    return isWatchPage(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('#layer-root-player-screen video') ?? document.querySelector('video');
  }

  videoId(): string | null {
    return watchIdOf(location.pathname);
  }

  /** The show and episode, as the player's title bar spells them, else the tab's own title. */
  title(): string | null {
    const show = document.querySelector('[class*="Title-Fuse-Web-Play"]')?.textContent?.trim();
    const episode = document.querySelector('[class*="SeasonEpisode-Fuse-Web-Play"]')?.textContent?.trim();
    const named = show ? (episode ? `${show} ${episode}` : show) : document.title.replace(/\s*•\s*HBO Max\s*$/i, '');
    // The tab's title is wrapped in bidi marks.
    const clean = named.replace(/[⁦-⁩‎‏]/g, '').trim();
    return clean || null;
  }

  /** The watch page. HBO Max has no documented way to open one at a moment, so the card links to the title. */
  deepLink(_seconds: number): string | null {
    const id = watchIdOf(location.pathname);
    return id ? `${location.origin}/video/watch/${id}` : null;
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#tracks.map((t) => ({
      id: t.id,
      lang: t.language,
      label: t.label,
      ...(t.forced ? { forced: true } : {}),
      ...(t.cc ? { cc: true } : {}),
    }));
  }

  loadTrack(id: string): Promise<Cue[]> {
    const track = this.#tracks.find((t) => t.id === id);
    if (!track) return Promise.reject(new Error(`libregaku: no HBO Max subtitle track "${id}"`));
    const key = track.urls[0] ?? id;
    const cached = this.#cues.get(key);
    if (cached) return cached;
    const loading = this.#load(track);
    this.#cues.set(key, loading);
    if (this.#cues.size > MAX_CACHED) {
      const oldest = this.#cues.keys().next().value;
      if (oldest !== undefined) this.#cues.delete(oldest);
    }
    // A failed load must not be the answer for the rest of the session.
    loading.catch(() => {
      if (this.#cues.get(key) === loading) this.#cues.delete(key);
    });
    return loading;
  }

  async #load(track: MxTrack): Promise<Cue[]> {
    const texts = new Array<string>(track.urls.length).fill('');
    let next = 0;
    const worker = async (): Promise<void> => {
      for (let i = next++; i < track.urls.length; i = next++) {
        texts[i] = await fetchText(track.urls[i] ?? '');
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, track.urls.length) }, worker));
    const cues = cuesFromSegments(texts);
    if (!cues.length) throw new Error(`libregaku: ${ui.errors.noCuesParsed}`);
    return cues;
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }

  #syncUrl(): void {
    const id = watchIdOf(location.pathname);
    if (id === this.#watchId) return;
    this.#watchId = id;
    this.#navCbs.forEach((cb) => cb());
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for HBO Max; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG || m.kind !== 'mx-mpd') return;
    // The page is not trusted — any script on it can post this — so the manifest must be HBO Max-hosted.
    if (typeof m.url !== 'string' || typeof m.text !== 'string' || !isMediaUrl(m.url)) return;

    const tracks = asTracks(textTracks(m.text, m.url));
    if (!tracks.length) return;
    const same =
      tracks.length === this.#tracks.length && tracks.every((t, i) => t.urls[0] === this.#tracks[i]?.urls[0]);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
