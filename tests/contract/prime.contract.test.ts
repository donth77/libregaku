import { describe, expect, it, type TestContext } from 'vitest';
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

/**
 * Amazon answers some requests from datacenter addresses with a robot check
 * in place of the page: a captcha form, or a 503 that asks automated clients
 * to write in. The storefront then has no titles on it, which says nothing
 * about Prime Video's shape, so the run is inconclusive, as YouTube's is
 * behind its bot check. On four of the six days to 16 October GitHub's
 * runner was given a storefront with no title on it, or an error, where a
 * browser elsewhere saw titles; what it was given was not kept. Any other
 * page without a title still fails, and now says what it was.
 */
export function robotCheck(html: string): string | null {
  return /\/errors\/validateCaptcha|api-services-support@amazon\.com|not a robot|characters you see/i.test(html)
    ? 'Prime Video served a robot check'
    : null;
}

function inconclusive(ctx: TestContext, why: string): never {
  // A GitHub annotation, so an inconclusive day is visible on the run.
  console.log(`::warning title=Prime Video canary inconclusive::${why} — this runner cannot see the storefront`);
  return ctx.skip() as never;
}

/** What a page was, for a message: its status, where it ended up, its title and its size. */
function served(res: Response, html: string): string {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
  return `HTTP ${res.status} from ${res.url}${title ? `, titled "${title}"` : ''}, ${Math.round(html.length / 1024)} KB`;
}

type Client = { blocked: string } | { title: string; bundles: number; body: string };

let cached: Promise<Client> | null = null;

/** A title page found from the home page, and the text of the web client it loads; or why this runner saw neither. */
function client(): Promise<Client> {
  if (cached) return cached;
  cached = (async (): Promise<Client> => {
    // Not the root, which sends a visitor without a session to an offers page with no titles on it.
    const store = await fetch('https://www.primevideo.com/storefront', { headers: HEADERS, redirect: 'follow' });
    const html = await store.text();
    const robot = robotCheck(html);
    if (robot) return { blocked: `${robot} (${served(store, html)})` };
    expect(store.ok, `primevideo.com/storefront: ${served(store, html)}`).toBe(true);
    // A title is taken from the page rather than hard-coded: titles leave the catalogue.
    const title = html.match(/\/detail\/[A-Za-z0-9]{8,}/)?.[0];
    expect(
      title,
      `Could not find a /detail/<id> link on primevideo.com/storefront (${served(store, html)}).\n` +
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
  // A failure is not kept: the retries in vitest.contract.config.ts are for a blip, and fetch again.
  // Kept, each retry failed on the first answer in a millisecond.
  cached.catch(() => {
    cached = null;
  });
  return cached;
}

describe('prime contract', () => {
  it('a title page and its web client are still publicly fetchable', async (ctx) => {
    const found = await client();
    if ('blocked' in found) inconclusive(ctx, found.blocked);
    const { title, bundles, body } = found;
    expect(body.length).toBeGreaterThan(1_000_000);
    console.log(`  prime video: ${title}, ${bundles} bundles (${Math.round(body.length / 1024)} KB)`);
  }, 90_000);

  /**
   * Weak in the way the Netflix name checks are: the element's id is also what
   * the page itself focuses and measures, so this says the page still calls it
   * that, not that the player is still drawn inside it.
   */
  it('pv.video — the web client still names #dv-web-player', async (ctx) => {
    const found = await client();
    if ('blocked' in found) inconclusive(ctx, found.blocked);
    expect(
      found.body.includes('dv-web-player'),
      `"dv-web-player" is gone from Prime Video's web client.\n${describeFailure('pv.video')}`,
    ).toBe(true);
  }, 90_000);

  it('recognises a robot check, so it is never mistaken for a broken site', () => {
    expect(robotCheck('<form method="get" action="/errors/validateCaptcha" name="">')).toMatch(/robot check/);
    expect(robotCheck('To discuss automated access to Amazon data please contact api-services-support@amazon.com.')).toMatch(/robot check/);
    expect(robotCheck('<a href="/detail/0ABCDEFGH1/ref=atv_hm_hom_c_9zZ8D2_1_1">')).toBeNull();
  });
});
