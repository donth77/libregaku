import { readFileSync } from 'node:fs';
import { expect } from 'vitest';

/**
 * A fetch from the extension only succeeds if every host it touches —
 * including each redirect hop — is declared in host_permissions. A service
 * moving its assets to a new CDN therefore breaks us with a bare
 * "Failed to fetch" while the endpoint itself still answers 200 to curl.
 * This has now happened twice (GitHub release assets, then jpod101 audio),
 * so the canaries walk the redirect chain and check each hop.
 */

const manifest = JSON.parse(readFileSync('src/manifest.json', 'utf8')) as { host_permissions: string[] };

const patterns = manifest.host_permissions.map(
  (p) => new RegExp('^' + p.replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$'),
);

export function permitted(url: string): boolean {
  return patterns.some((p) => p.test(url));
}

/**
 * A gateway's error is a host having a bad minute, not a file that moved. On
 * 5 November 2026 GitHub's release downloads answered 504 to one request in a
 * few, and krdict and own-cedict, which ask for up to six files a try, failed
 * all three tries of vitest's retry, each time on a different file: that retry
 * runs the whole test again at once. This asks again for the one file, after a
 * wait. A host that is still answering so after the last wait fails the test.
 */
const GATEWAY_ERRORS = new Set([502, 503, 504]);
const WAITS = [2_000, 5_000];

async function ask(url: string, init: RequestInit): Promise<Response> {
  for (const wait of WAITS) {
    const res = await fetch(url, { ...init, redirect: 'manual' });
    if (!GATEWAY_ERRORS.has(res.status)) return res;
    await res.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return fetch(url, { ...init, redirect: 'manual' });
}

/** Follow redirects by hand, asserting each hop is a permitted host. Returns the final response. */
export async function fetchCheckingHops(url: string, init: RequestInit = {}, hint = ''): Promise<Response> {
  for (let hop = 0; hop < 8; hop++) {
    expect(
      permitted(url),
      `${url} is not covered by host_permissions in src/manifest.json — ` +
        `the extension's fetch will fail with "Failed to fetch".${hint ? `\n${hint}` : ''}`,
    ).toBe(true);
    const res = await ask(url, init);
    const loc = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !loc) return res;
    url = new URL(loc, url).href;
  }
  throw new Error(`too many redirects from ${url}`);
}
