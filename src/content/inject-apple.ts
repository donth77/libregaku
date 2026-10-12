/**
 * Page-world script for Apple TV+.
 *
 * The player fetches an HLS master playlist for each title. It lists every
 * subtitle rendition, and the URL carries a signed token, so, as on YouTube,
 * the request is observed rather than built (AGENTS.md, invariant 6). This
 * hooks fetch and XMLHttpRequest and passes on any master playlist that lists
 * subtitles. Reading it is `src/adapters/hls.ts`'s job; matching the subtitle
 * clock to the player's is `src/adapters/apple-clock.ts`'s.
 */

const TAG = 'libregaku';

/** Set once the hooks are in, so a second injection does not post every playlist twice. */
const INSTALLED = '__libregakuAppleHook';

/** Playlists kept for a content script that starts listening after they arrived. */
const REMEMBER = 4;

interface Found {
  url: string;
  text: string;
}

const page = window as unknown as Record<string, unknown>;

if (page[INSTALLED]) {
  console.debug('[libregaku] apple tv page hook already installed');
} else {
  page[INSTALLED] = true;
  // Read by scripts/diagnose.js to prove a page hook ran.
  page['__libregakuHook'] = true;
  install();
}

function install(): void {
  console.log('%c[libregaku] apple tv page hook installed', 'color:#8AA2E8');

  const remembered: Found[] = [];

  const publish = (found: Found): void => {
    window.postMessage({ source: TAG, kind: 'apple-master', url: found.url, text: found.text }, '*');
  };

  const inspect = (url: string, text: string): void => {
    if (!/\.m3u8(?:[?#]|$)/i.test(url)) return;
    // A master playlist lists its variants; a rendition's own playlist does not, and nor does a subtitle list.
    if (!/#EXT-X-STREAM-INF/.test(text) || !/#EXT-X-MEDIA:[^\n]*TYPE=SUBTITLES/i.test(text)) return;
    const older = remembered.findIndex((f) => f.url === url);
    if (older >= 0) remembered.splice(older, 1);
    remembered.push({ url, text });
    if (remembered.length > REMEMBER) remembered.shift();
    publish({ url, text });
    console.debug('[libregaku] apple tv master playlist with subtitles seen');
  };

  const nativeFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const answer = nativeFetch.apply(this as never, args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (/\.m3u8/i.test(url)) {
        void answer
          .then((res) => res.clone().text().then((text) => inspect(res.url || url, text)))
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
      if (/\.m3u8/i.test(url)) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === '' || this.responseType === 'text') inspect(url, this.responseText);
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

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    // Latest last: a replay must leave the newest playlist on top.
    if (m.source === TAG && m.kind === 'apple-request-master') remembered.forEach(publish);
  });
}

export {};
