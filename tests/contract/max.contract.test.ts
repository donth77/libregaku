import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isWatchPage } from '../../src/adapters/max';
import { describeFailure } from '../../src/assumptions';

/**
 * HBO Max canaries.
 *
 * Like Netflix, Disney+ and Prime Video, HBO Max cannot be played in CI: it needs
 * an account and DRM. Until 30 October 2026 its player's web app was served to
 * anyone at play.hbomax.com, and its bundles carried the class family the
 * adapter matches (Fuse-Web-Play), which this canary read. Since then
 * play.hbomax.com sends every path to the same one on www.hbomax.com, which
 * shows anyone not signed in its marketing site; the sign-in page, the one
 * part of the app still served to anyone, names its own components
 * (Fuse-Web-Auth) only in bundles it loads later.
 *
 * What this catches: mx.address. A watch page on play.hbomax.com still lands
 * where the extension runs: a host its content scripts are given in the
 * manifest, and a page the adapter takes for a watch page.
 * What it does not, and cannot without signing in:
 *   - mx.caption-dom and mx.video: the player's class names and its <video>.
 *     src/adapters/__tests__ pins how we read them; nothing checks them here.
 *   - mx.manifest and mx.segments. The DASH manifest and its WebVTT segments
 *     exist only for a signed-in playback session.
 *   - any change of meaning where the name survives, as with Netflix.
 */

/** No title has this id; the address is all that is asked about. */
const WATCH = 'https://play.hbomax.com/video/watch/00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000000';

interface ContentScript {
  matches: string[];
  js?: string[];
}
const manifest = JSON.parse(readFileSync('src/manifest.json', 'utf8')) as { content_scripts: ContentScript[] };

/** Whether the manifest runs this script on the page: its match patterns, as Chrome reads a host with no wildcard. */
function runs(script: string, url: string): boolean {
  return manifest.content_scripts.some(
    (c) =>
      c.js?.includes(script) &&
      c.matches.some((p) => new RegExp('^' + p.replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$').test(url)),
  );
}

/**
 * Where an address lands, its redirects followed by hand. The redirect is the
 * same for anyone; past it, www.hbomax.com answers a signed-out visitor with a
 * 404 or, from some addresses, a 403, and neither is followed.
 */
async function landing(url: string): Promise<string> {
  for (let hop = 0; hop < 8; hop++) {
    const res = await fetch(url, { redirect: 'manual' });
    const next = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !next) return url;
    url = new URL(next, url).href;
  }
  throw new Error(`too many redirects from ${WATCH}`);
}

describe('max contract', () => {
  it('mx.address — a watch page on play.hbomax.com lands where the extension runs', async () => {
    const landed = await landing(WATCH);
    console.log(`  max: ${WATCH.slice(0, 48)}… lands on ${landed.slice(0, 48)}…`);
    const broken = `It landed on ${landed}.\n${describeFailure('mx.address')}`;
    expect(runs('content.js', landed), `the content script does not run there. ${broken}`).toBe(true);
    expect(runs('inject-max.js', landed), `the page hook does not run there. ${broken}`).toBe(true);
    expect(isWatchPage(landed), `the adapter does not take it for a watch page. ${broken}`).toBe(true);
  });
});
