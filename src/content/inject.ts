/**
 * Page-world script. Runs in YouTube's own JS context (`world: MAIN`), which is
 * the only place `window.fetch` and `ytInitialPlayerResponse` are reachable.
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

type Msg =
  | { source: typeof TAG; kind: 'track-url'; url: string }
  | { source: typeof TAG; kind: 'track-list'; tracks: RawTrack[]; videoId: string | null };

interface RawTrack {
  baseUrl: string;
  languageCode: string;
  name?: string;
  kind?: string;
}

function post(msg: Msg): void {
  window.postMessage(msg, '*');
}

function looksLikeTimedText(u: string): boolean {
  return u.includes(TIMEDTEXT);
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

function readTrackList(): boolean {
  try {
    const pr = (window as unknown as { ytInitialPlayerResponse?: unknown })
      .ytInitialPlayerResponse as
      | {
          captions?: {
            playerCaptionsTracklistRenderer?: {
              captionTracks?: Array<{
                baseUrl: string;
                languageCode: string;
                name?: { simpleText?: string };
                kind?: string;
              }>;
            };
          };
          videoDetails?: { videoId?: string };
        }
      | undefined;

    const raw = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!raw?.length) return false;

    post({
      source: TAG,
      kind: 'track-list',
      videoId: pr?.videoDetails?.videoId ?? null,
      tracks: raw.map((t) => ({
        baseUrl: t.baseUrl,
        languageCode: t.languageCode,
        name: t.name?.simpleText,
        kind: t.kind,
      })),
    });
    return true;
  } catch {
    /* the shape changed; the wire watcher above still covers us */
    return false;
  }
}

/**
 * `ytInitialPlayerResponse` does not exist at document_start — YouTube assigns
 * it from an inline script further down the page. Reading it once here finds
 * nothing, so we do two things: trap the assignment, and poll as a fallback for
 * the cases where the trap can't be installed or the value arrives another way.
 */

let published = false;

function tryPublish(reason: string): boolean {
  if (published) return true;
  published = readTrackList();
  if (published) console.debug('[libregaku] track list published via', reason);
  return published;
}

try {
  const w = window as unknown as Record<string, unknown>;
  let stash = w['ytInitialPlayerResponse'];
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    get: () => stash,
    set: (v: unknown) => {
      stash = v;
      published = false;            // a new video: republish
      setTimeout(() => tryPublish('assignment'), 0);
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
function enableCaptions(lang: string): void {
  const report: string[] = [];

  // 1. The player API, when it exists.
  const player = document.getElementById('movie_player') as unknown as {
    loadModule?: (m: string) => void;
    getOption?: (m: string, o: string) => unknown;
    setOption?: (m: string, o: string, v: unknown) => void;
  } | null;

  if (typeof player?.loadModule === 'function') {
    try {
      player.loadModule('captions');
      const list = (player.getOption?.('captions', 'tracklist') ?? []) as Array<{
        languageCode?: string; kind?: string;
      }>;
      report.push(`api:${list.length} tracks`);
      const want =
        list.find((t) => (t.languageCode ?? '').startsWith(lang) && t.kind !== 'asr') ??
        list.find((t) => (t.languageCode ?? '').startsWith(lang));
      if (want) {
        player.setOption?.('captions', 'track', want);
        report.push(`api:set ${want.languageCode}`);
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
  const d = e.data as { source?: string; kind?: string; lang?: string } | null;
  if (!d || d.source !== TAG || d.kind !== 'enable-captions') return;
  enableCaptions(d.lang ?? 'ja');
  // The player sometimes needs a beat before the module is live.
  setTimeout(() => enableCaptions(d.lang ?? 'ja'), 1200);
});

tryPublish('immediate');

let tries = 0;
const poll = setInterval(() => {
  if (tryPublish('poll') || ++tries > 80) clearInterval(poll);   // ~20s
}, 250);

// SPA navigation swaps the player response without a page load.
window.addEventListener('yt-navigate-finish', () => {
  published = false;
  tries = 0;
  let n = 0;
  const again = setInterval(() => {
    if (tryPublish('navigate') || ++n > 40) clearInterval(again);
  }, 250);
});

export {};
