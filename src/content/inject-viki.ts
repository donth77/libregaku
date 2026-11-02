/**
 * Page-world script for Viki.
 *
 * Viki's player plays DASH. The manifest it fetches lists every subtitle
 * track as a text AdaptationSet whose one file is the whole track, and both
 * the manifest's URL and each track's carry a signed query or the session's
 * token — so the request is observed rather than built (AGENTS.md, invariant
 * 6). This hooks fetch and XMLHttpRequest and passes on any answer from
 * Viki's manifest host. Reading the manifest is `src/adapters/viki.ts`'s job.
 */

// A module, so its names are its own and do not collide with the other page hooks' under typecheck.
export {};

const TAG = 'libregaku';

/** Set once the hooks are in, so a second injection does not post every manifest twice. */
const INSTALLED = '__libregakuVikiHook';

/** Manifests kept for a content script that starts listening after they arrived, or a next episode's. */
const REMEMBER = 4;

interface Found {
  url: string;
  text: string;
}

const page = window as unknown as Record<string, unknown>;

if (page[INSTALLED]) {
  console.debug('[libregaku] viki page hook already installed');
} else {
  page[INSTALLED] = true;
  // Read by scripts/diagnose.js to prove a page hook ran.
  page['__libregakuHook'] = true;
  install();
}

function install(): void {
  console.log('%c[libregaku] viki page hook installed', 'color:#8AA2E8');

  const remembered: Found[] = [];

  const publish = (found: Found): void => {
    window.postMessage({ source: TAG, kind: 'vk-mpd', url: found.url, text: found.text }, '*');
  };

  const inspect = (url: string, text: string): void => {
    // A manifest with no subtitles is not worth passing on.
    if (!/<MPD[\s>]/.test(text) || !/contentType="text"|mimeType="text\//.test(text)) return;
    const older = remembered.findIndex((f) => f.url === url);
    if (older >= 0) remembered.splice(older, 1);
    remembered.push({ url, text });
    if (remembered.length > REMEMBER) remembered.shift();
    publish({ url, text });
    console.debug('[libregaku] viki manifest with subtitles seen');
  };

  // Only Viki's manifest host: what else the page fetches is none of this script's business.
  const isManifest = (url: string): boolean => /^https:\/\/manifest-viki\.viki\.io\/[^?#]*\.mpd(?:[?#]|$)/i.test(url);

  const nativeFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const answer = nativeFetch.apply(this as never, args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (isManifest(url)) {
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
      if (isManifest(url)) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === '' || this.responseType === 'text') inspect(this.responseURL || url, this.responseText);
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
    if (m.source === TAG && m.kind === 'vk-request-mpd') remembered.forEach(publish);
  });
}
