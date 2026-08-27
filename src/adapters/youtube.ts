import type { Cue, SubtitleSource, TrackInfo } from './types';

/**
 * YouTube. Captions come from `/api/timedtext`, which YouTube signs — so we use
 * URLs the page produced rather than any we assemble. `inject.ts` publishes two
 * signals; we prefer a live URL seen on the wire and fall back to the player
 * response's `baseUrl`.
 */

interface RawTrack {
  baseUrl: string;
  languageCode: string;
  name?: string;
  kind?: string;
}

/** json3 is YouTube's own JSON caption format. */
interface Json3 {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string }>;
  }>;
}

export class YouTubeAdapter implements SubtitleSource {
  readonly id = 'youtube';
  readonly domCaptions = {
    container: '.ytp-caption-window-container',
    segment: '.ytp-caption-segment',
  };
  readonly playerRoot = ['#movie_player'];

  #tracks: RawTrack[] = [];
  #liveUrls = new Map<string, string>();
  #lastLiveUrl: string | null = null;
  #videoId: string | null = null;
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    window.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string } | null;
      if (!d || d.source !== 'libregaku') return;

      if (d.kind === 'track-url') {
        const u = (d as unknown as { url: string }).url;
        this.#lastLiveUrl = u;
        // Signed URLs carry their language; keep them keyed so a captured
        // English URL is never used to fetch the Japanese track.
        try {
          const lang = new URL(u, location.href).searchParams.get('lang');
          if (lang) this.#liveUrls.set(lang, u);
        } catch { /* keep the unkeyed fallback */ }
      } else if (d.kind === 'track-list') {
        const m = d as unknown as { tracks: RawTrack[]; videoId: string | null };
        this.#tracks = m.tracks;
        if (m.videoId) this.#videoId = m.videoId;
        // The list usually arrives *after* the content script first ran, so
        // this is the signal that actually starts rendering.
        this.#trackCbs.forEach((cb) => cb());
      }
    });

    window.addEventListener('yt-navigate-finish', () => {
      this.#liveUrls.clear();
      this.#lastLiveUrl = null;
      this.#navCbs.forEach((cb) => cb());
    });
  }

  matches(url: string): boolean {
    return /^https:\/\/(www\.)?youtube\.com\/watch/.test(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video.html5-main-video, #movie_player video');
  }

  videoId(): string | null {
    return this.#videoId ?? new URLSearchParams(location.search).get('v');
  }

  title(): string | null {
    return (
      document.querySelector('meta[name="title"]')?.getAttribute('content') ??
      document.title.replace(/ - YouTube$/, '') ??
      null
    );
  }

  deepLink(seconds: number): string | null {
    const id = this.videoId();
    return id ? `https://www.youtube.com/watch?v=${id}&t=${Math.floor(seconds)}s` : null;
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
  }

  async listTracks(): Promise<TrackInfo[]> {
    return this.#tracks.map((t, i) => ({
      id: String(i),
      lang: t.languageCode,
      label: t.name ?? t.languageCode,
      generated: t.kind === 'asr',
    }));
  }

  async loadTrack(id: string): Promise<Cue[]> {
    const track = this.#tracks[Number(id)];
    if (!track) throw new Error('libregaku: unknown track ' + id);

    // A bare `baseUrl` returns an empty body without a proof-of-origin token,
    // so the only reliable source is a URL YouTube itself signed. If we haven't
    // captured one for this language, ask the player to switch the track on and
    // wait for the request to appear on the wire.
    let signed = this.#liveUrls.get(track.languageCode) ?? null;
    if (!signed) {
      window.postMessage(
        { source: 'libregaku', kind: 'enable-captions', lang: track.languageCode },
        '*',
      );
      signed = await this.#awaitSigned(track.languageCode, 8000);
      if (!signed) {
        console.log(
          '%c[libregaku]%c player did not produce a signed caption URL — ' +
            'switch captions on in the player and it will pick them up',
          'color:#8AA2E8', '',
        );
      }
    }
    const candidates: Array<[string, string]> = [];
    const add = (label: string, base: string | null, fmt?: string) => {
      if (!base) return;
      try {
        const u = new URL(base, location.href);
        if (fmt) u.searchParams.set('fmt', fmt);
        else u.searchParams.delete('fmt');
        candidates.push([label, u.href]);
      } catch { /* skip malformed */ }
    };

    // Any signed URL carries the tokens YouTube requires; the `lang` param
    // selects which track it returns. So a signed URL captured for a different
    // language is still worth re-pointing at the one we want.
    const relang = (u: string | null): string | null => {
      if (!u) return null;
      try {
        const url = new URL(u, location.href);
        if (url.searchParams.get('lang') === track.languageCode) return u;
        url.searchParams.set('lang', track.languageCode);
        url.searchParams.delete('tlang');
        return url.href;
      } catch { return null; }
    };

    add('signed+json3', signed, 'json3');
    add('signed+xml', signed);
    add('relang+json3', relang(this.#lastLiveUrl), 'json3');
    add('relang+xml', relang(this.#lastLiveUrl));
    add('lastSeen+json3', this.#lastLiveUrl, 'json3');
    add('base+json3', track.baseUrl, 'json3');
    add('base+xml', track.baseUrl);

    const tried: string[] = [];
    for (const [label, url] of candidates) {
      let body: string;
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) { tried.push(`${label}:HTTP ${res.status}`); continue; }
        body = (await res.text()).trim();
      } catch (e) {
        tried.push(`${label}:${String(e)}`);
        continue;
      }
      if (!body) { tried.push(`${label}:empty`); continue; }

      const cues = body.startsWith('{') ? parseJson3(JSON.parse(body) as Json3) : parseTimedTextXml(body);
      if (cues.length) {
        console.log(`%c[libregaku]%c caption format: ${label} (${cues.length} cues)`,
                    'color:#8AA2E8', '');
        return cues;
      }
      tried.push(`${label}:0 cues`);
    }

    throw new Error('libregaku: no caption format worked — ' + tried.join(', '));
  }

  /** Poll for a signed URL for `lang`, which the fetch hook fills in. */
  async #awaitSigned(lang: string, timeoutMs: number): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const exact = this.#liveUrls.get(lang);
      if (exact) return exact;
      await new Promise((r) => setTimeout(r, 150));
    }
    // No exact match, but any signed URL can be re-pointed by `lang`.
    return this.#liveUrls.get(lang) ?? null;
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  /** Fires whenever a caption track list becomes available. */
  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }
}

export function parseJson3(data: Json3): Cue[] {
  const cues: Cue[] = [];
  for (const ev of data.events ?? []) {
    if (ev.tStartMs === undefined || !ev.segs) continue;
    const text = ev.segs.map((s) => s.utf8 ?? '').join('').trim();
    if (!text || text === '\n') continue;
    const start = ev.tStartMs / 1000;
    cues.push({ start, end: start + (ev.dDurationMs ?? 4000) / 1000, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** srv1/srv3: <transcript><text start="1.5" dur="2">…</text></transcript> */
export function parseTimedTextXml(xml: string): Cue[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const cues: Cue[] = [];
  for (const el of Array.from(doc.querySelectorAll('text, p'))) {
    const startAttr = el.getAttribute('start') ?? el.getAttribute('t');
    if (startAttr === null) continue;
    // srv3 uses milliseconds in `t`/`d`; srv1 uses seconds in `start`/`dur`.
    const ms = el.hasAttribute('t');
    const start = Number(startAttr) / (ms ? 1000 : 1);
    const durAttr = el.getAttribute('dur') ?? el.getAttribute('d');
    const dur = durAttr === null ? 4 : Number(durAttr) / (ms ? 1000 : 1);

    const text = (el.textContent ?? '')
      .replace(/&amp;#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
      .trim();
    if (!text || !Number.isFinite(start)) continue;
    cues.push({ start, end: start + (Number.isFinite(dur) ? dur : 4), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
