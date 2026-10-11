/**
 * Page-world script for Prime Video.
 *
 * Before it plays, the player asks Amazon for the title's playback resources,
 * and the answer lists every subtitle track with a URL to its file. The
 * request is signed for the session, so it is observed rather than made
 * (AGENTS.md, invariant 6): this hooks fetch and XMLHttpRequest and passes on
 * the tracks in any such answer. Reading the answer is
 * `src/adapters/pv-resources.ts`'s job.
 */

import { tracksFrom, type PvPublished } from '../adapters/pv-resources';

const TAG = 'libregaku';

/** Set once the hooks are in, so a second injection does not post every list twice. */
const INSTALLED = '__libregakuPrimeHook';

/** The request whose answer lists the subtitle tracks. */
const RESOURCES = /Get(?:Vod)?PlaybackResources/;

/** Lists kept for a content script that starts listening after they arrived. */
const REMEMBER = 4;

const page = window as unknown as Record<string, unknown>;

if (page[INSTALLED]) {
  console.debug('[libregaku] prime video page hook already installed');
} else {
  page[INSTALLED] = true;
  // Read by scripts/diagnose.js to prove a page hook ran.
  page['__libregakuHook'] = true;
  install();
}

function install(): void {
  console.log('%c[libregaku] prime video page hook installed', 'color:#8AA2E8');

  const remembered: PvPublished[][] = [];

  const publish = (tracks: PvPublished[]): void => {
    window.postMessage({ source: TAG, kind: 'pv-tracks', tracks }, '*');
  };

  const inspect = (text: string): void => {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    const tracks = tracksFrom(data);
    if (!tracks) return;
    remembered.push(tracks);
    if (remembered.length > REMEMBER) remembered.shift();
    publish(tracks);
    console.debug('[libregaku] prime video tracks:', tracks.map((t) => t.language).join(', '));
  };

  const nativeFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const answer = nativeFetch.apply(this as never, args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (RESOURCES.test(url)) {
        void answer
          .then((res) => res.clone().text())
          .then(inspect)
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
      if (RESOURCES.test(String(args[1] ?? ''))) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === '' || this.responseType === 'text') inspect(this.responseText);
            else if (this.responseType === 'json') inspect(JSON.stringify(this.response));
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
    // Latest last: a replay must leave the newest list on top.
    if (m.source === TAG && m.kind === 'pv-request-tracks') remembered.forEach(publish);
  });
}
