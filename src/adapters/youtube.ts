import { ui } from '../i18n';
import type { Cue, SubtitleSource, TrackInfo } from './types';
import { fetchViaTranscriptPanel } from './yt-transcript';

/**
 * YouTube. Captions come from `/api/timedtext`, which YouTube signs — so we use
 * URLs the page produced rather than any we assemble. `inject.ts` publishes two
 * signals; we prefer a live URL seen on the wire and fall back to the player
 * response's `baseUrl`.
 *
 * Everything here is per video, and "which video" is the one in the address
 * bar. YouTube is a single-page app that keeps one player for every video you
 * click through, and plays adverts in it too, so a signal is only trusted when
 * it names the video on screen. Trusting whatever arrived last is how the
 * first video's title, links and tracks survived every later video, and how a
 * pre-roll ad's English captions became the Japanese line for a whole video.
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

/** Only the page's own caption endpoint, never a look-alike from a frame. */
function timedTextUrl(raw: string): URL | null {
  try {
    const u = new URL(raw, location.href);
    return /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname === '/api/timedtext' ? u : null;
  } catch {
    return null;
  }
}

/** Human and auto-generated tracks in one language are different tracks. */
function urlKey(video: string, lang: string, kind: string | null | undefined): string {
  return `${video}|${lang}|${kind === 'asr' ? 'asr' : ''}`;
}

function isRawTrack(t: unknown): t is RawTrack {
  const r = t as RawTrack | null;
  return Boolean(r) && typeof r?.baseUrl === 'string' && typeof r?.languageCode === 'string';
}

export class YouTubeAdapter implements SubtitleSource {
  readonly id = 'youtube';
  readonly domCaptions = {
    container: '.ytp-caption-window-container',
    segment: '.ytp-caption-segment',
  };
  readonly playerRoot = ['#movie_player'];

  #tracks: RawTrack[] = [];
  /** The video `#tracks` describes. Null until a list for this video arrives. */
  #tracksFor: string | null = null;
  #title: string | null = null;
  /** Signed timedtext URLs seen on the wire, keyed by video, language and kind. */
  #liveUrls = new Map<string, string>();
  /** The video the last navigation landed on, so a repeat event is not a change. */
  #shownVideo: string | null = null;
  #navCbs: Array<() => void> = [];
  #trackCbs: Array<() => void> = [];

  constructor() {
    this.#shownVideo = this.#urlVideoId();

    window.addEventListener('message', (e: MessageEvent) => {
      // Only the page's own hook. A frame on the page — an ad, an embed — can
      // post to this window too, and must not be able to hand us tracks.
      if (e.source !== window) return;
      const d = e.data as { source?: string; kind?: string } | null;
      if (!d || d.source !== 'libregaku') return;

      if (d.kind === 'track-url') {
        const url = (d as { url?: unknown }).url;
        if (typeof url === 'string') this.#capture(url);
      } else if (d.kind === 'track-list') {
        const m = d as { tracks?: unknown; videoId?: unknown; title?: unknown };
        const id = typeof m.videoId === 'string' ? m.videoId : null;
        // A list for another video — the page we just left, or YouTube's
        // never-updated initial response — is worse than no list at all.
        if (!id || id !== this.#urlVideoId() || !Array.isArray(m.tracks)) return;
        this.#tracks = m.tracks.filter(isRawTrack);
        this.#tracksFor = id;
        this.#title = typeof m.title === 'string' && m.title ? m.title : null;
        // The list usually arrives *after* the content script first ran, so
        // this is the signal that actually starts rendering.
        this.#trackCbs.forEach((cb) => cb());
      }
    });

    window.addEventListener('yt-navigate-finish', () => {
      const now = this.#urlVideoId();
      // YouTube fires this on the first load too, and again for the same video
      // after some in-page updates. Only a different video is a navigation.
      if (now === this.#shownVideo) {
        if (!this.#tracksFor) this.#requestTrackList();
        return;
      }
      this.#shownVideo = now;
      // Everything below belonged to the video we just left.
      this.#tracks = [];
      this.#tracksFor = null;
      this.#title = null;
      this.#liveUrls.clear();
      this.#navCbs.forEach((cb) => cb());
      this.#requestTrackList();
    });

    // The page hook may have published before this script existed to hear it.
    this.#requestTrackList();
  }

  matches(url: string): boolean {
    return /^https:\/\/(www\.)?youtube\.com\/watch/.test(url);
  }

  video(): HTMLVideoElement | null {
    return document.querySelector<HTMLVideoElement>('video.html5-main-video, #movie_player video');
  }

  /** The address bar is the authority on which video this is. */
  videoId(): string | null {
    return this.#urlVideoId() ?? this.#tracksFor;
  }

  /**
   * The player's own title for this video. Not `<meta name="title">`: YouTube
   * writes that once on a full page load and never again, so every video
   * reached by clicking inherited the first one's title.
   */
  title(): string | null {
    if (this.#title && this.#tracksFor === this.#urlVideoId()) return this.#title;
    const heading = document.querySelector('ytd-watch-metadata h1, h1.ytd-watch-metadata')?.textContent?.trim();
    if (heading) return heading;
    const fromTab = document.title.replace(/^\(\d+\)\s*/, '').replace(/ - YouTube$/, '').trim();
    return fromTab || null;
  }

  deepLink(seconds: number): string | null {
    const id = this.videoId();
    return id ? `https://www.youtube.com/watch?v=${id}&t=${Math.floor(seconds)}s` : null;
  }

  hideNative(): void {
    document.documentElement.classList.add('libregaku-active');
  }

  /** YouTube marks the player while an advert plays in the same element. */
  isAd(): boolean {
    return document.getElementById('movie_player')?.classList.contains('ad-showing') ?? false;
  }

  /**
   * From the top of the progress bar to the bottom of the player: the strip
   * holding the play, captions, settings, theater and fullscreen buttons. It
   * fades when idle but keeps its box, so the measurement holds either way.
   */
  controlsHeight(): number {
    const player = document.getElementById('movie_player');
    const bar = player?.querySelector<HTMLElement>('.ytp-chrome-bottom');
    if (!player || !bar) return 0;
    const p = player.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    if (!b.height) return 0;
    return Math.max(0, Math.round(p.bottom - b.top));
  }

  /** True once the player has said this video carries no captions at all. */
  noSubtitles(): boolean {
    return this.#tracksFor !== null && this.#tracksFor === this.#urlVideoId() && !this.#tracks.length;
  }

  async listTracks(): Promise<TrackInfo[]> {
    if (this.#tracksFor !== this.#urlVideoId()) return [];
    return this.#tracks.map((t, i) => ({
      id: String(i),
      lang: t.languageCode,
      label: t.name ?? t.languageCode,
      generated: t.kind === 'asr',
    }));
  }

  async loadTrack(id: string): Promise<Cue[]> {
    const video = this.#tracksFor;
    const track = this.#tracks[Number(id)];
    if (!track || !video || video !== this.#urlVideoId()) {
      throw new Error(`libregaku: ${ui.errors.unknownTrack(id)}`);
    }
    const want = urlKey(video, track.languageCode, track.kind);

    // A bare `baseUrl` returns an empty body without a proof-of-origin token,
    // so the only reliable source is a URL YouTube itself signed. If we haven't
    // captured one for this track, ask the player to switch it on and wait for
    // the request to appear on the wire.
    let signed = this.#liveUrls.get(want) ?? null;
    if (!signed) {
      signed = await this.#requestSigned(video, track, want);
      if (!signed) {
        console.log(
          '%c[libregaku]%c player did not produce a signed caption URL for this track — ' +
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

    /*
     * A signed URL for this video carries the tokens YouTube requires, and
     * `lang` and `kind` select the track — they are outside the signature
     * (registered as yt.timedtext-relang). A URL for any other video is never
     * used: that is how an ad's captions got in. And there is deliberately no
     * last-resort "whatever was seen last": a different language returned as
     * the one asked for is worse than no line, because nothing looks wrong.
     */
    const relang = (u: string | null): string | null => {
      if (!u) return null;
      try {
        const url = new URL(u, location.href);
        url.searchParams.set('lang', track.languageCode);
        if (track.kind === 'asr') url.searchParams.set('kind', 'asr');
        else url.searchParams.delete('kind');
        url.searchParams.delete('tlang');
        return url.href;
      } catch { return null; }
    };
    const sibling = [...this.#liveUrls.entries()].find(([k]) => k.startsWith(`${video}|`))?.[1] ?? null;

    add('signed+json3', signed, 'json3');
    add('signed+xml', signed);
    if (!signed) {
      add('relang+json3', relang(sibling), 'json3');
      add('relang+xml', relang(sibling));
    }
    add('base+json3', track.baseUrl, 'json3');
    add('base+xml', track.baseUrl);

    const tried: string[] = [];
    for (const [label, url] of candidates) {
      let cues: Cue[];
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) { tried.push(`${label}:HTTP ${res.status}`); continue; }
        const body = (await res.text()).trim();
        if (!body) { tried.push(`${label}:${ui.errors.emptyAnswer}`); continue; }
        // Inside the try: one malformed body must not end the search.
        cues = body.startsWith('{') ? parseJson3(JSON.parse(body) as Json3) : parseTimedTextXml(body);
      } catch (e) {
        tried.push(`${label}:${String(e)}`);
        continue;
      }
      if (cues.length) {
        console.log(`%c[libregaku]%c caption format: ${label} (${cues.length} cues)`,
                    'color:#8AA2E8', '');
        return cues;
      }
      tried.push(`${label}:${ui.errors.noCues}`);
    }

    // On screen when the line under the subtitles fails: in the interface language.
    throw new Error(`libregaku: ${ui.errors.noCaptionFormat(tried)}`);
  }

  /** Read YouTube's own transcript panel — no token, no player internals. */
  async fallbackTrack(): Promise<Cue[]> {
    return fetchViaTranscriptPanel();
  }

  onNavigate(cb: () => void): void {
    this.#navCbs.push(cb);
  }

  /** Fires whenever a caption track list becomes available. */
  onTracks(cb: () => void): void {
    this.#trackCbs.push(cb);
  }

  #urlVideoId(): string | null {
    return new URLSearchParams(location.search).get('v');
  }

  #requestTrackList(): void {
    window.postMessage({ source: 'libregaku', kind: 'request-track-list' }, location.origin);
  }

  /** Keep a signed URL, but only one for the video on screen. */
  #capture(raw: string): void {
    const u = timedTextUrl(raw);
    if (!u) return;
    const v = u.searchParams.get('v');
    const lang = u.searchParams.get('lang');
    // An auto-translated track (`tlang`) is a machine translation of `lang`,
    // not `lang` itself, and an ad's captions name the ad's own video.
    if (!v || !lang || u.searchParams.has('tlang') || v !== this.#urlVideoId()) return;
    /*
     * No proof-of-origin token, no captions: YouTube answers such a request
     * with an empty 200. The player sends one itself in the first seconds of
     * a page, before its token is minted, and never retries it — so keeping
     * it meant fetching nothing, forever, on every fresh load.
     */
    if (!u.searchParams.has('pot')) return;
    this.#liveUrls.set(urlKey(v, lang, u.searchParams.get('kind')), u.href);
  }

  /**
   * Ask the player to switch this track on, and wait for the signed request
   * to appear on the wire — which the fetch hook turns into `#liveUrls`.
   *
   * An ad owns the player's captions while it plays, so asking then switches
   * on the ad's, and its length says nothing about whether ours will come.
   * The clock stops for the ad and the request is made again after it.
   */
  async #requestSigned(video: string, track: RawTrack, key: string): Promise<string | null> {
    const WAIT_MS = 10_000;
    /*
     * Asked again at this interval. The first answer on a fresh page can come
     * before the player has its token, and asking for the track it already
     * has does nothing — so later asks switch the track off and on again,
     * which makes the player request it afresh, token and all.
     */
    const ASK_EVERY_MS = 2500;
    const giveUpAt = Date.now() + 5 * 60_000;   // longer than any ad break
    let deadline = Date.now() + WAIT_MS;
    let askedAt = 0;
    let asks = 0;
    while (Date.now() < deadline && Date.now() < giveUpAt) {
      const hit = this.#liveUrls.get(key);
      if (hit) return hit;
      // The learner moved on to another video; this track is not wanted now.
      if (this.#urlVideoId() !== video) return null;
      if (this.isAd()) {
        askedAt = 0;
        deadline = Date.now() + WAIT_MS;
      } else if (Date.now() - askedAt >= ASK_EVERY_MS) {
        window.postMessage(
          {
            source: 'libregaku', kind: 'enable-captions',
            lang: track.languageCode, asr: track.kind === 'asr', force: asks > 0,
          },
          location.origin,
        );
        askedAt = Date.now();
        asks++;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    return this.#liveUrls.get(key) ?? null;
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

/** A character reference's character, or the reference itself if it names none. */
function codePoint(n: number, original: string): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return original;
  }
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

    // srv1 escapes its text twice, so after XML parsing a line still reads
    // `I&#39;m` — decode the character references that are left.
    const text = (el.textContent ?? '')
      .replace(/&#(\d+);/g, (m, n: string) => codePoint(Number(n), m))
      .replace(/&#x([0-9a-f]+);/gi, (m, n: string) => codePoint(parseInt(n, 16), m))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
    if (!text || !Number.isFinite(start)) continue;
    cues.push({ start, end: start + (Number.isFinite(dur) ? dur : 4), text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
