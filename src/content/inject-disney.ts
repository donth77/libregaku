/**
 * Page-world script for Disney+.
 *
 * Disney+ plays HLS. The master playlist the player fetches lists every
 * subtitle rendition, and its URL carries a signed, expiring token in the
 * path — so, as on YouTube, the request is observed rather than built
 * (AGENTS.md, invariant 6). This hooks fetch and XMLHttpRequest, and passes
 * on any .m3u8 answer that lists subtitles. Reading the playlist is
 * `src/adapters/hls.ts`'s job, away from this plumbing.
 *
 * It also keeps time and seeks. The <video>'s currentTime is not the
 * programme's clock here, and the player API that knows the position — and
 * seeks to one — exists only in the page world.
 */

const TAG = 'libregaku';

/** Set once the hooks are in, so a second injection does not post every playlist twice. */
const INSTALLED = '__libregakuDisneyHook';

/** Playlists kept for a content script that starts listening after they arrived. */
const REMEMBER = 4;

interface Found {
  url: string;
  text: string;
}

const page = window as unknown as Record<string, unknown>;

if (page[INSTALLED]) {
  console.debug('[libregaku] disney+ page hook already installed');
} else {
  page[INSTALLED] = true;
  // Read by scripts/diagnose.js to prove a page hook ran.
  page['__libregakuHook'] = true;
  install();
}

function install(): void {
  console.log('%c[libregaku] disney+ page hook installed', 'color:#8AA2E8');

  const remembered: Found[] = [];

  const publish = (found: Found): void => {
    window.postMessage({ source: TAG, kind: 'dp-master', url: found.url, text: found.text }, '*');
  };

  const inspect = (url: string, text: string): void => {
    if (!/\.m3u8(?:[?#]|$)/i.test(url)) return;
    if (!/#EXT-X-MEDIA:[^\n]*TYPE=SUBTITLES/i.test(text)) return;
    const older = remembered.findIndex((f) => f.url === url);
    if (older >= 0) remembered.splice(older, 1);
    remembered.push({ url, text });
    if (remembered.length > REMEMBER) remembered.shift();
    publish({ url, text });
    console.debug('[libregaku] disney+ master playlist with subtitles seen');
  };

  const nativeFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const answer = nativeFetch.apply(this as never, args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (/\.m3u8(?:[?#]|$)/i.test(url)) {
        void answer
          .then((res) => res.clone().text())
          .then((text) => inspect(url, text))
          .catch(() => { /* never let instrumentation break playback */ });
      }
    } catch {
      /* never let instrumentation break playback */
    }
    return answer;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    try {
      const url = String(args[1] ?? '');
      if (/\.m3u8(?:[?#]|$)/i.test(url)) {
        this.addEventListener('load', () => {
          try {
            // responseText throws for a binary responseType; such an answer is not a playlist we can read.
            if (this.responseType === '' || this.responseType === 'text') {
              inspect(this.responseURL || url, this.responseText);
            }
          } catch {
            /* never let instrumentation break playback */
          }
        });
      }
    } catch {
      /* never let instrumentation break playback */
    }
    return (nativeOpen as (...a: unknown[]) => void).apply(this, args);
  };

  /** The clock offset last reported, so only a change is. */
  let reported: number | null = null;

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG) return;
    if (m.kind === 'dp-request-master') {
      remembered.forEach(publish);
      // A content script that has just started has no clock either: say it again.
      reported = null;
    } else if (m.kind === 'dp-seek') {
      if (typeof m.ms !== 'number' || !Number.isFinite(m.ms) || m.ms < 0) return;
      try {
        player()?.seek?.(m.ms);
      } catch (e) {
        console.warn('[libregaku] disney+ player refused a seek:', e);
      }
    }
  });

  // The <video>'s clock is not the programme's: it starts from where this
  // session began and starts again after a seek. The player knows where it
  // is; report how far the element's clock is from that, whenever it changes.
  setInterval(() => {
    try {
      const ms = player()?.timeline?.info?.playheadPositionMs;
      const video = document.querySelector<HTMLVideoElement>('video.hive-video') ?? document.querySelector('video');
      if (typeof ms !== 'number' || !Number.isFinite(ms) || !video || video.seeking) return;
      const offset = ms / 1000 - video.currentTime;
      // The position is sampled, so it wobbles by a frame or two against a running clock.
      if (reported !== null && Math.abs(offset - reported) < 0.25) return;
      reported = offset;
      window.postMessage({ source: TAG, kind: 'dp-clock', offset }, '*');
    } catch {
      /* never let instrumentation break playback */
    }
  }, 200);
}

/** The slice of the player's API this script touches. Every link may be missing. */
interface DpPlayer {
  seek?: (ms: number) => void;
  timeline?: { info?: { playheadPositionMs?: unknown } };
}

/** The player behind <disney-web-player>, or null before it exists. */
function player(): DpPlayer | null {
  const host = document.querySelector('disney-web-player') as (Element & { mediaPlayer?: DpPlayer }) | null;
  return host?.mediaPlayer ?? null;
}
