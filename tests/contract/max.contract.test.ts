import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * HBO Max canaries.
 *
 * Like Netflix, Disney+ and Prime Video, HBO Max cannot be played in CI: it needs
 * an account and DRM. Its web app shell at play.hbomax.com is served to anyone,
 * though, and its own bundles (play/<name>.sha.js) carry the component names
 * the player is styled with, so a rename of the caption family shows up here
 * without logging in.
 *
 * What this catches: the app's bundles are still reachable from the shell, and
 * the generated class family the adapter matches (Fuse-Web-Play) is still
 * there.
 * What it does not, and cannot without playing something:
 *   - mx.caption-dom's specific names (CaptionWindow, TextCue) and mx.video's
 *     PlayerRootContainer. They are not in the shell bundles, which means they
 *     load with the player after sign-in. src/adapters/__tests__ pins how we
 *     read them; nothing checks them here.
 *   - mx.manifest and mx.segments. The DASH manifest and its WebVTT segments
 *     exist only for a signed-in playback session.
 *   - any change of meaning where the name survives, as with Netflix.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HEADERS = { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' };

const BUNDLE = /\/play\/[A-Za-z0-9._-]+\.sha\.js/g;

let cached: Promise<{ bundles: number; body: string }> | null = null;

/** The web app's bundles, found from the shell's references, as one text. */
function app(): Promise<{ bundles: number; body: string }> {
  cached ??= (async () => {
    const shell = await fetch('https://play.hbomax.com/', { headers: HEADERS, redirect: 'follow' });
    expect(shell.ok, `play.hbomax.com returned HTTP ${shell.status}`).toBe(true);
    const paths = [...new Set((await shell.text()).match(BUNDLE) ?? [])];
    expect(
      paths.length,
      'Found no /play/*.sha.js bundles on play.hbomax.com.\n' +
        'HBO Max may have moved or renamed its web app — which is itself a signal, not just a broken test.',
    ).toBeGreaterThan(0);

    const bodies = await Promise.all(
      paths.map(async (p) => {
        const res = await fetch(new URL(p, 'https://play.hbomax.com/'), { headers: HEADERS });
        expect(res.ok, `${p} returned HTTP ${res.status}`).toBe(true);
        return res.text();
      }),
    );
    return { bundles: paths.length, body: bodies.join('\n') };
  })();
  return cached;
}

describe('max contract', () => {
  it('the web app shell and its bundles are still publicly fetchable', async () => {
    const { bundles, body } = await app();
    expect(body.length, 'the bundles are suspiciously small').toBeGreaterThan(100_000);
    console.log(`  max: ${bundles} bundles (${Math.round(body.length / 1024)} KB)`);
  }, 90_000);

  /**
   * Weak, as the Netflix name checks are: this says the app still styles its
   * components with the family prefix, not that the caption window is drawn
   * with it. The adapter matches "CaptionWindow-Fuse-Web-Play" and
   * "TextCue-Fuse-Web-Play", and the shell carries the family but not those names.
   */
  it('mx.caption-dom — the app still uses the Fuse-Web-Play class family', async () => {
    const { body } = await app();
    expect(
      body.includes('Fuse-Web-Play'),
      `"Fuse-Web-Play" is gone from HBO Max's web app.\n${describeFailure('mx.caption-dom')}`,
    ).toBe(true);
  }, 90_000);
});
