import { parseTtml } from './ttml';
import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * Netflix. The track list arrives inside the player manifest, which
 * `inject-netflix.ts` captures by hooking `JSON.parse`.
 *
 * Unlike YouTube, the subtitle URLs Netflix hands out are directly fetchable —
 * no signing dance. The DOM fallback is still declared, because M0 established
 * that assuming a fetch will succeed is how this breaks silently.
 */

interface NfTrack {
  url: string;
  language: string;
  label: string;
  forced: boolean;
  cc: boolean;
}

export class NetflixAdapter implements SubtitleSource {
  readonly id = 'netflix';
  readonly domCaptions = {
    container: '.player-timedtext',
    segment: '.player-timedtext-text-container',
    join: '\n',
  };
  readonly playerRoot = ['.watch-video--player-view', '.watch-video', '[data-uia="video-canvas"]'];

  #tracks: NfTrack[] = [];
  #movieId: string | null = null;
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string } | null;
      if (!d || d.source !== 'libregaku' || d.kind !== 'nf-tracks') return;

      const m = d as unknown as { tracks: NfTrack[]; movieId: string | null };
      this.#tracks = m.tracks;
      const changed = m.movieId != null && m.movieId !== this.#movieId;
      if (m.movieId != null) this.#movieId = m.movieId;
      if (changed) this.#navCbs.forEach((cb) => cb());
      this.#trackCbs.forEach((cb) => cb());
    });

    // Netflix is an SPA; the watch id changes without a page load.
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      this.#tracks = [];
      this.#navCbs.forEach((cb) => cb());
    }, 500);
  }

  matches(url: string): boolean {
    return /^https:\/\/(www\.)?netflix\.com\/watch\//.test(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video');
  }

  videoId(): string | null {
    return this.#movieId ?? location.pathname.split('/watch/')[1]?.split(/[?/]/)[0] ?? null;
  }

  title(): string | null {
    // Netflix builds the title bar from the show and episode; the document
    // title is the most stable thing available without touching internals.
    const el = document.querySelector('.video-title, [data-uia="video-title"]');
    return el?.textContent?.trim() || document.title.replace(/ - Netflix$/, '') || null;
  }

  /** Netflix watch URLs accept a `t` parameter in seconds. */
  deepLink(seconds: number): string | null {
    const id = location.pathname.split('/watch/')[1]?.split(/[?/]/)[0];
    return id ? `https://www.netflix.com/watch/${id}?t=${Math.floor(seconds)}` : null;
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#tracks.map((t, i) => ({
      id: String(i),
      lang: t.language,
      label: t.label + (t.forced ? ' (forced)' : ''),
      generated: false,
      forced: t.forced,
      cc: t.cc,
    }));
  }

  async loadTrack(id: string): Promise<Cue[]> {
    const track = this.#tracks[Number(id)];
    if (!track) throw new Error('libregaku: unknown track ' + id);

    const res = await fetch(track.url);
    if (!res.ok) throw new Error(`libregaku: subtitle fetch ${res.status}`);
    const body = (await res.text()).trim();
    if (!body) throw new Error('libregaku: subtitle body was empty');

    // Netflix serves imsc1 TTML; WebVTT shows up on some titles.
    const cues = body.startsWith('WEBVTT') ? parseVtt(body) : parseTtml(body);
    if (!cues.length) throw new Error('libregaku: subtitle parsed to zero cues');
    return cues;
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }
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
    const text = lines.slice(idx + 1).join('\n').trim();
    if (!text || !from || !to) continue;
    cues.push({ start: clock(from), end: clock(to.trim().split(/\s+/)[0] ?? ''), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
