import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Prime Video canaries.
 *
 * Like Netflix and Disney+, Prime Video cannot be played in CI. Unlike them,
 * almost nothing the adapter reads is in anything served without a session:
 * the title page and its web client (DVWebClient_*.js) carry the page around
 * the player, and the player SDK that draws subtitles and requests the
 * playback resources loads only when a signed-in session starts playing.
 *
 * So this is the thinnest of the site canaries, and says what it leaves out:
 *   - pv.resources, pv.subtitle-files, pv.caption-dom. The playback resources
 *     answer, the TTML files and the .atvwebplayersdk-captions-* classes all
 *     live behind playback. src/adapters/__tests__ pins how we read them;
 *     nothing checks that Prime Video still writes them that way. At runtime
 *     the adapter warns when a subtitle URL is on a host it does not know.
 *   - any change of meaning where a name survives, as with Netflix.
 * What it does check: that a title page still loads, that its web client
 * bundles are still found, and that the client still names the player's
 * element (pv.video).
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HEADERS = { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' };

const CLIENT = /https:\/\/m\.media-amazon\.com\/images\/S\/sash\/[^"'\s<>\\]+DVWebClient_[a-z]+\.[0-9a-f]+\.js/g;

let cached: Promise<{ title: string; bundles: number; body: string }> | null = null;

/** A title page found from the home page, and the text of the web client it loads. */
function client(): Promise<{ title: string; bundles: number; body: string }> {
  cached ??= (async () => {
    // Not the root, which sends a visitor without a session to an offers page with no titles on it.
    const store = await fetch('https://www.primevideo.com/storefront', { headers: HEADERS, redirect: 'follow' });
    expect(store.ok, `primevideo.com/storefront returned HTTP ${store.status}`).toBe(true);
    // A title is taken from the page rather than hard-coded: titles leave the catalogue.
    const title = (await store.text()).match(/\/detail\/[A-Za-z0-9]{8,}/)?.[0];
    expect(
      title,
      'Could not find a /detail/<id> link on primevideo.com/storefront.\n' +
        'Prime Video may have changed how title pages are linked — which is itself worth a look.',
    ).toBeTruthy();

    const page = await fetch(`https://www.primevideo.com${title}`, { headers: HEADERS, redirect: 'follow' });
    expect(page.ok, `${title} returned HTTP ${page.status}`).toBe(true);
    const urls = [...new Set((await page.text()).match(CLIENT) ?? [])];
    expect(
      urls.length,
      'Found no DVWebClient bundles on a title page.\n' +
        'Prime Video may have renamed or relocated its web client — which is itself a signal, not just a broken test.',
    ).toBeGreaterThan(0);

    const bodies = await Promise.all(
      urls.map(async (u) => {
        const res = await fetch(u, { headers: { 'user-agent': UA } });
        expect(res.ok, `${u} returned HTTP ${res.status}`).toBe(true);
        return res.text();
      }),
    );
    return { title: title!, bundles: urls.length, body: bodies.join('\n') };
  })();
  return cached;
}

describe('prime contract', () => {
  it('a title page and its web client are still publicly fetchable', async () => {
    const { title, bundles, body } = await client();
    expect(body.length).toBeGreaterThan(1_000_000);
    console.log(`  prime video: ${title}, ${bundles} bundles (${Math.round(body.length / 1024)} KB)`);
  }, 90_000);

  /**
   * Weak in the way the Netflix name checks are: the element's id is also what
   * the page itself focuses and measures, so this says the page still calls it
   * that, not that the player is still drawn inside it.
   */
  it('pv.video — the web client still names #dv-web-player', async () => {
    const { body } = await client();
    expect(
      body.includes('dv-web-player'),
      `"dv-web-player" is gone from Prime Video's web client.\n${describeFailure('pv.video')}`,
    ).toBe(true);
  }, 90_000);
});
