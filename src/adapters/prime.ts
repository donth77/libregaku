import { ui } from '../i18n';
import { parseVtt } from './netflix';
import { bcp47 } from './pv-resources';
import { parseTtml } from './ttml';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Prime Video. The track list arrives in the playback resources the player
 * asks for before it plays, which `inject-prime.ts` passes on. Each track is
 * one TTML file, fetched whole; the <video>'s clock is the programme's.
 *
 * The answer does not name its title, so the list served is the last one the
 * page received. A next episode's arriving early would be served for the end
 * of this one.
 */

const TAG = 'libregaku';

/** Where Prime Video serves subtitle files. A URL anywhere else did not come from its player. */
const SUBTITLE_HOST = /(^|\.)pv-cdn\.net$/;

/** The player's own element. The trailer on a title's page is drawn with the same classes, outside it. */
const PLAYER = '#dv-web-player';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CACHED = 16;

const warned = new Set<string>();

function isSubtitleUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false;
  try {
    const url = new URL(u);
    if (url.protocol === 'https:' && SUBTITLE_HOST.test(url.hostname)) return true;
    if (!warned.has(url.host)) {
      warned.add(url.host);
      console.warn(
        `[libregaku] ignoring a Prime Video subtitle URL on ${url.protocol}//${url.host}. If Amazon has moved ` +
          'its subtitle CDN, SUBTITLE_HOST in src/adapters/prime.ts needs the new host.',
      );
    }
  } catch {
    /* not a URL at all */
  }
  return false;
}

/** The id in a /detail/<id> path, or null anywhere else. */
export function detailIdOf(pathname: string): string | null {
  return /\/detail\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

interface PvTrack {
  /** Language, kind, and position among tracks sharing both: stable across a refreshed list. */
  id: string;
  url: string;
  language: string;
  label: string;
  forced: boolean;
  cc: boolean;
}

/**
 * Tracks from a page message. The page is not trusted — any script on it can
 * post one — so only well-formed entries with Amazon-hosted https URLs count.
 */
export function readTracks(raw: unknown): PvTrack[] {
  if (!Array.isArray(raw)) return [];
  const out: PvTrack[] = [];
  const seen = new Map<string, number>();
  for (const entry of raw as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    const r = entry as Record<string, unknown>;
    if (!isSubtitleUrl(r.url)) continue;
    const language = typeof r.language === 'string' ? bcp47(r.language) : '';
    const forced = r.forced === true;
    const cc = r.cc === true;
    const key = `${language}:${forced ? 'forced' : cc ? 'cc' : 'sub'}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.push({
      id: `${key}:${n}`,
      url: r.url,
      language,
      label: typeof r.label === 'string' && r.label ? r.label : language,
      forced,
      cc,
    });
  }
  return out;
}

async function fetchCues(url: string): Promise<Cue[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  let body: string;
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = (await res.text()).trim();
  } catch (e) {
    throw new Error(`libregaku: ${ctl.signal.aborted ? ui.errors.noAnswerWithin(FETCH_TIMEOUT_MS / 1000) : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  if (!body) throw new Error(`libregaku: ${ui.errors.emptyAnswer}`);
  // TTML ("TTMLv2") is what the player is given; WebVTT is read in case a title is served it.
  const cues = body.startsWith('WEBVTT') ? parseVtt(body) : parseTtml(body);
  if (!cues.length) throw new Error(`libregaku: ${ui.errors.noCuesParsed}`);
  return cues;
}

export class PrimeAdapter implements SubtitleSource {
  readonly id = 'prime';
  readonly domCaptions = {
    container: `${PLAYER} .atvwebplayersdk-captions-overlay`,
    segment: '.atvwebplayersdk-captions-text',
    join: '\n',
  };
  readonly playerRoot = [`${PLAYER} .atvwebplayersdk-player-container`, `${PLAYER} .webPlayerSDKContainer`, PLAYER];

  #tracks: PvTrack[] = [];
  /** Cues by subtitle URL, in flight or done. */
  #cues = new Map<string, Promise<Cue[]>>();
  #detailId: string | null = detailIdOf(location.pathname);
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => this.#onMessage(e));
    // Prime Video is an SPA; the title changes without a page load.
    setInterval(() => this.#syncUrl(), 500);
    // The page hook may have seen the answer before this script existed to hear about it.
    window.postMessage({ source: TAG, kind: 'pv-request-tracks' }, '*');
  }

  /**
   * A title's page: the player opens over it, and the address does not change when it does.
   * In the United States Prime Video is as often watched on amazon.com, under /gp/video/, with the
   * same web client (pv.amazon).
   */
  matches(url: string): boolean {
    return /^https:\/\/(www\.)?primevideo\.com\/.*\/?detail\//.test(url) || /^https:\/\/www\.amazon\.com\/gp\/video\/(?:.*\/)?detail\//.test(url);
  }

  /**
   * The player's <video>. The title's page plays a trailer in an element of
   * its own, the same size, so only one inside the player (#dv-web-player)
   * counts. Null on a title's page before Play.
   */
  video(): HTMLVideoElement | null {
    const loaded = Array.from(document.querySelectorAll<HTMLVideoElement>(`${PLAYER} video`)).filter(
      (v) => v.readyState > 0 && v.clientWidth > 0,
    );
    return loaded.find((v) => !v.paused) ?? loaded[0] ?? null;
  }

  videoId(): string | null {
    return detailIdOf(location.pathname);
  }

  /** The show, and the episode where the player names one. */
  title(): string | null {
    const show = document.querySelector('.atvwebplayersdk-title-text')?.textContent?.trim();
    const episode = document.querySelector('.atvwebplayersdk-subtitle-text')?.textContent?.trim();
    if (show) return episode ? `${show} — ${episode}` : show;
    const named = document.title.replace(/^Prime Video:\s*/i, '').trim();
    return named || null;
  }

  /** The title's own Play link, which carries the second to start at, on the site it was watched on. */
  deepLink(seconds: number): string | null {
    const id = detailIdOf(location.pathname);
    if (!id) return null;
    const page = location.hostname === 'www.amazon.com' ? 'https://www.amazon.com/gp/video/detail' : 'https://www.primevideo.com/detail';
    return `${page}/${id}?autoplay=1&t=${Math.max(0, Math.floor(seconds))}`;
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
    if (!track) return Promise.reject(new Error(`libregaku: no Prime Video subtitle track "${id}"`));
    const cached = this.#cues.get(track.url);
    if (cached) return cached;
    const loading = fetchCues(track.url);
    this.#cues.set(track.url, loading);
    if (this.#cues.size > MAX_CACHED) {
      const oldest = this.#cues.keys().next().value;
      if (oldest !== undefined) this.#cues.delete(oldest);
    }
    // A failed load must not be the answer for the rest of the session.
    loading.catch(() => {
      if (this.#cues.get(track.url) === loading) this.#cues.delete(track.url);
    });
    return loading;
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
    const id = detailIdOf(location.pathname);
    if (id === this.#detailId) return;
    this.#detailId = id;
    this.#navCbs.forEach((cb) => cb());
  }

  #onMessage(e: MessageEvent): void {
    // Only this window's own page hook speaks for Prime Video; a frame on the page does not.
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG || m.kind !== 'pv-tracks') return;
    const tracks = readTracks(m.tracks);
    if (!tracks.length) return;
    const same = tracks.length === this.#tracks.length && tracks.every((t, i) => t.url === this.#tracks[i]?.url);
    if (same) return;
    this.#tracks = tracks;
    this.#trackCbs.forEach((cb) => cb());
  }
}
