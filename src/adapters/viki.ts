import { ui } from '../i18n';
import { textTracks, type DashTrack } from './dash';
import { cuesFromSegments } from './hls';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Rakuten Viki. Its player (video.js) plays DASH, and the manifest lists each
 * subtitle language as a text AdaptationSet whose one Representation is the
 * whole track: a WebVTT file on api.viki.io, its URL carrying the session's
 * token. `inject-viki.ts` passes on the manifest the player itself fetched;
 * nothing here builds a URL.
 *
 * The page fetches manifests of other videos too (a promotion, the next
 * episode), so a manifest is taken only when its path names the video in the
 * address bar, and a track only when its file is that video's.
 */

const TAG = 'libregaku';

/** Where Viki serves a video's manifest: manifest-viki.viki.io/v1/<video id>/…/manifest.mpd. */
const MANIFEST = /^https:\/\/manifest-viki\.viki\.io\/v1\/(\d+v)\//;
/** Where a track's file is: api.viki.io/v4/videos/<video id>/auth_subtitles/<language>.vtt. */
const SUBTITLES = /^https:\/\/api\.viki\.io\/v4\/videos\/(\d+v)\/auth_subtitles\/[^/?#]+\.vtt(?:[?#]|$)/;

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CACHED = 16;

/** The video's id in a /videos/<id>v-<name> path ("1172595v"), or null anywhere else. */
export function watchIdOf(pathname: string): string | null {
  return /^\/videos\/(\d+v)(?:[-/]|$)/.exec(pathname)?.[1] ?? null;
}

/** A video's page, where the player is. */
export function isWatchPage(url: string): boolean {
  return /^https:\/\/www\.viki\.com\/videos\/\d+v(?:[-/?#]|$)/.test(url);
}

/** The video a manifest URL is for, or null for a URL that is not one of Viki's manifests. */
export function manifestVideo(url: string): string | null {
  return MANIFEST.exec(url)?.[1] ?? null;
}

/** Viki's codes for Chinese name the script, as "zh" and "zt"; everything else is a language tag already. */
export function languageOf(code: string): string {
  return code === 'zt' ? 'zh-Hant' : code === 'zh' ? 'zh-Hans' : code;
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

interface VkTrack extends DashTrack {
  id: string;
}

/** Each track of `video` whose file is that video's own on api.viki.io, with an id that survives a refreshed manifest. */
export function asTracks(tracks: DashTrack[], video: string): VkTrack[] {
  const seen = new Map<string, number>();
  const out: VkTrack[] = [];
  for (const t of tracks) {
    if (t.urls.length !== 1 || SUBTITLES.exec(t.urls[0] ?? '')?.[1] !== video) continue;
    const language = languageOf(t.language);
    const n = seen.get(language) ?? 0;
    seen.set(language, n + 1);
    out.push({ ...t, language, id: `${language}:${n}` });
  }
  return out;
}

export class VikiAdapter implements SubtitleSource {
  readonly id = 'viki';
  readonly domCaptions = {
    container: '#vmplayer_id .vjs-text-track-display',
    segment: '.vjs-text-track-cue',
    join: '\n',
  };
  // video.js puts the <video>, its control bar and its subtitles inside this one element.
  readonly playerRoot = ['#vmplayer_id', '.video-player'];
  // The progress bar ("00:35 Remaining Time -59:01") and the buttons in the middle of the picture
  // measured as another extension's subtitles while they showed, and the line rose above them.
  readonly controls = '.vjs-control-bar, .vmp-progress-bar, .vmp-center-control, .vmp-skip-base-button, .vjs-big-play-button';

  #tracks: VkTrack[] = [];
  /** Cues by the track's file, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  #watchId: string | null = watchIdOf(location.pathname);
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // Viki moves to the next episode without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the manifest before this script existed to hear about it.
    this.#askForManifests();
  }

  matches(url: string): boolean {
    return isWatchPage(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('#vmplayer_id video') ?? document.querySelector('video');
  }

  videoId(): string | null {
    return watchIdOf(location.pathname);
  }

  /** The tab's title, without the site's name after it: "Search - Episode 1". */
  title(): string | null {
    return document.title.replace(/\s*\|\s*(Rakuten\s+)?Viki\s*$/i, '').trim() || null;
  }

  /** The video's page. Viki has no documented way to open one at a moment, so the card links to the episode. */
  deepLink(_seconds: number): string | null {
    const id = watchIdOf(location.pathname);
    return id ? `${location.origin}/videos/${id}` : null;
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#tracks.map((t) => ({ id: t.id, lang: t.language, label: t.label }));
  }

  loadTrack(id: string): Promise<Cue[]> {
    const track = this.#tracks.find((t) => t.id === id);
    if (!track) return Promise.reject(new Error(`libregaku: no Viki subtitle track "${id}"`));
    const key = track.urls[0] ?? id;
    const cached = this.#cues.get(key);
    if (cached) return cached;
    const loading = this.#load(key);
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

  async #load(url: string): Promise<Cue[]> {
    const cues = cuesFromSegments([await fetchText(url)]);
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

  #askForManifests(): void {
    window.postMessage({ source: TAG, kind: 'vk-request-mpd' }, '*');
  }

  #syncUrl(): void {
    const id = watchIdOf(location.pathname);
    if (id === this.#watchId) return;
    this.#watchId = id;
    // The last video's tracks are not this one's; the next episode's manifest may already have been fetched.
    this.#tracks = [];
    this.#navCbs.forEach((cb) => cb());
    this.#askForManifests();
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Viki; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG || m.kind !== 'vk-mpd') return;
    // The page is not trusted — any script on it can post this — so the manifest must be Viki's, for this video.
    if (typeof m.url !== 'string' || typeof m.text !== 'string') return;
    const video = manifestVideo(m.url);
    if (!video || video !== this.#watchId) return;

    const tracks = asTracks(textTracks(m.text, m.url), video);
    if (!tracks.length) return;
    const same = tracks.length === this.#tracks.length && tracks.every((t, i) => t.urls[0] === this.#tracks[i]?.urls[0]);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
