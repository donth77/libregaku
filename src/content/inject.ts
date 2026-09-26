/**
 * Page-world script. Runs in YouTube's own JS context (`world: MAIN`), which is
 * the only place `window.fetch` and the player's own API are reachable.
 *
 * We never build a timedtext URL ourselves — YouTube signs them, and a
 * hand-assembled URL works briefly and then stops. Instead we observe the
 * request the page itself makes and reuse it verbatim.
 *
 * Two signals are published to the isolated world via postMessage:
 *   lg:track-url   a live timedtext URL, seen on the wire  (most reliable)
 *   lg:track-list  caption tracks from the player response (available earlier)
 */

const TAG = 'libregaku';
const TIMEDTEXT = '/api/timedtext';

// Unconditional, so its absence is itself a diagnosis: if you never see this,
// the MAIN-world script did not run and nothing downstream can work.
console.log('%c[libregaku] page hook installed', 'color:#8AA2E8');
// Flag the page world so the diagnostic can prove this script ran.
(window as unknown as Record<string, unknown>)['__libregakuHook'] = true;

interface RawTrack {
  baseUrl: string;
  languageCode: string;
  name?: string;
  kind?: string;
}

type Msg =
  | { source: typeof TAG; kind: 'track-url'; url: string }
  | { source: typeof TAG; kind: 'track-list'; tracks: RawTrack[]; videoId: string; title: string | null };

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        languageCode: string;
        name?: { simpleText?: string; runs?: Array<{ text?: string }> };
        kind?: string;
      }>;
    };
  };
  videoDetails?: { videoId?: string; title?: string };
}

interface Player {
  getPlayerResponse?: () => PlayerResponse | undefined;
  loadModule?: (m: string) => void;
  getOption?: (m: string, o: string) => unknown;
  setOption?: (m: string, o: string, v: unknown) => void;
}

function post(msg: Msg): void {
  // Same window only: the isolated world shares it, frames do not.
  window.postMessage(msg, location.origin);
}

function looksLikeTimedText(u: string): boolean {
  return u.includes(TIMEDTEXT);
}

function player(): Player | null {
  return document.getElementById('movie_player') as unknown as Player | null;
}

function currentVideoId(): string | null {
  return new URLSearchParams(location.search).get('v');
}

/* ── 1. Watch the wire ─────────────────────────────────────────── */

const nativeFetch = window.fetch;
window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
  try {
    const input = args[0];
    const url =
      typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : input instanceof Request ? input.url
      : '';
    if (url && looksLikeTimedText(url)) post({ source: TAG, kind: 'track-url', url });
  } catch {
    /* never let instrumentation break the page */
  }
  return nativeFetch.apply(this as typeof globalThis, args);
};

const nativeOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  ...rest: unknown[]
) {
  try {
    const u = typeof url === 'string' ? url : url.href;
    if (looksLikeTimedText(u)) post({ source: TAG, kind: 'track-url', url: u });
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line prefer-rest-params
  return nativeOpen.apply(this, arguments as unknown as Parameters<typeof nativeOpen>);
};

/* ── 2. Read the player response ───────────────────────────────── */

/**
 * `ytInitialPlayerResponse` does not exist at document_start — YouTube assigns
 * it from an inline script further down the page — so the assignment is
 * trapped. It is also only ever the *first* video's: YouTube never reassigns
 * it when you click through to another one. The live player's own
 * `getPlayerResponse()` follows the video actually loaded, so it is asked
 * first, and either answer is used only when it names the video in the
 * address bar.
 */
let initial: unknown = (window as unknown as Record<string, unknown>)['ytInitialPlayerResponse'];

function responseForCurrentVideo(): PlayerResponse | null {
  const want = currentVideoId();
  if (!want) return null;
  const candidates: unknown[] = [];
  try {
    candidates.push(player()?.getPlayerResponse?.());
  } catch {
    /* the player API is an assumption too (yt.player-api); fall through */
  }
  candidates.push(initial);
  for (const c of candidates) {
    const pr = c as PlayerResponse | undefined;
    if (pr?.videoDetails?.videoId === want) return pr;
  }
  return null;
}

/** Publish the current video's tracks. False while the player has not caught up. */
function readTrackList(): boolean {
  try {
    const pr = responseForCurrentVideo();
    const videoId = pr?.videoDetails?.videoId;
    if (!pr || !videoId) return false;

    // A response without captions is an answer too: this video has none.
    const raw = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    post({
      source: TAG,
      kind: 'track-list',
      videoId,
      title: pr.videoDetails?.title ?? null,
      tracks: raw.map((t) => ({
        baseUrl: t.baseUrl,
        languageCode: t.languageCode,
        name: t.name?.simpleText ?? t.name?.runs?.map((r) => r.text ?? '').join('') ?? undefined,
        kind: t.kind,
      })),
    });
    return true;
  } catch {
    /* the shape changed; the wire watcher above still covers us */
    return false;
  }
}

/** The video the last list was published for. */
let publishedFor: string | null = null;

function tryPublish(reason: string, force = false): boolean {
  const id = currentVideoId();
  if (!force && id && publishedFor === id) return true;
  if (!readTrackList()) return false;
  publishedFor = id;
  console.debug('[libregaku] track list published via', reason);
  return true;
}

let poll = 0;

/** Keep asking until the player has loaded the video in the address bar. */
function publishSoon(reason: string, force = false): void {
  clearInterval(poll);
  if (tryPublish(reason, force)) return;
  let n = 0;
  poll = window.setInterval(() => {
    if (tryPublish(reason) || ++n > 80) clearInterval(poll);   // ~20s
  }, 250);
}

try {
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    get: () => initial,
    set: (v: unknown) => {
      initial = v;
      setTimeout(() => publishSoon('assignment'), 0);
    },
  });
} catch {
  /* another extension may already own this property; polling still covers us */
}

/**
 * YouTube only fetches a caption track once the player asks for it, and a bare
 * `baseUrl` returns an empty body without a proof-of-origin token. So rather
 * than fetching captions ourselves, we ask the player to switch the track on
 * and capture the signed URL it produces. The player API exists only here, in
 * the page world.
 */
function enableCaptions(lang: string, asr: boolean, force: boolean): void {
  const report: string[] = [];
  const p = player();

  // During an ad the captions module belongs to the ad. Switching it on there
  // is how an ad's English captions were captured as the video's own.
  if (document.getElementById('movie_player')?.classList.contains('ad-showing')) {
    console.log('%c[libregaku]%c enable captions → skipped: an ad is playing', 'color:#8AA2E8', '');
    return;
  }

  // 1. The player API, when it exists.
  if (typeof p?.loadModule === 'function') {
    try {
      p.loadModule('captions');
      const list = (p.getOption?.('captions', 'tracklist') ?? []) as Array<{
        languageCode?: string; kind?: string;
      }>;
      report.push(`api:${list.length} tracks`);
      const inLang = list.filter((t) => (t.languageCode ?? '').startsWith(lang));
      const want =
        inLang.find((t) => (t.kind === 'asr') === asr) ??
        inLang[0];
      if (want && force) {
        // Setting the track the player already has requests nothing. Off and
        // on again does: the player fetches it anew, with the token it lacked
        // the first time.
        p.setOption?.('captions', 'track', {});
        const player = p;
        setTimeout(() => player.setOption?.('captions', 'track', want), 250);
        report.push(`api:reset ${want.languageCode}${want.kind === 'asr' ? ' (auto)' : ''}`);
      } else if (want) {
        p.setOption?.('captions', 'track', want);
        report.push(`api:set ${want.languageCode}${want.kind === 'asr' ? ' (auto)' : ''}`);
      } else {
        report.push('api:no matching track');
      }
    } catch (e) {
      report.push(`api:threw ${String(e).slice(0, 60)}`);
    }
  } else {
    report.push('api:unavailable');
  }

  // 2. The CC button. Crude, but it is what a person does and it always works.
  const btn = document.querySelector<HTMLElement>('.ytp-subtitles-button');
  if (btn) {
    if (btn.getAttribute('aria-pressed') === 'true') {
      report.push('cc:already on');
    } else {
      btn.click();
      report.push('cc:clicked');
    }
  } else {
    report.push('cc:button not found');
  }

  console.log('%c[libregaku]%c enable captions → ' + report.join(' | '), 'color:#8AA2E8', '');
}

window.addEventListener('message', (e: MessageEvent) => {
  // Only the extension's own content script, which shares this window.
  if (e.source !== window) return;
  const d = e.data as { source?: string; kind?: string; lang?: string; asr?: boolean } | null;
  if (!d || d.source !== TAG) return;

  if (d.kind === 'request-track-list') {
    // The content script arrives at document_idle, long after a list
    // published during parsing was posted to nobody. Answer it directly.
    publishSoon('request', true);
    return;
  }
  if (d.kind !== 'enable-captions') return;
  // The content script asks again, with force, until a signed request is
  // seen; there is no need to repeat anything here.
  enableCaptions(d.lang ?? 'ja', d.asr === true, (d as { force?: boolean }).force === true);
});

publishSoon('immediate');

// In-app navigation swaps the video without a page load.
window.addEventListener('yt-navigate-finish', () => publishSoon('navigate'));

export {};
