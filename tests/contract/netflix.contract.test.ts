import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Netflix canaries.
 *
 * Netflix cannot be driven end-to-end in CI — playback needs an authenticated
 * account and Widevine, which headless Chromium lacks. But it does not need to
 * be: Netflix ships its player as a public, unauthenticated JS bundle
 * (cadmium-playercore), and every selector and manifest field this extension
 * depends on is a literal string inside it. If Netflix renames one, it vanishes
 * from the bundle, and that is detectable in seconds without logging in.
 *
 * What this catches: renamed DOM classes, renamed manifest fields.
 * What it does not: behavioural change where the name survives but its meaning
 * shifts. For that there is no substitute for watching something.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

let cached: { url: string; body: string } | null = null;

/** Find the current playercore URL from a public page, then fetch it. */
async function playerCore(): Promise<{ url: string; body: string }> {
  if (cached) return cached;

  // The bundle URL is referenced from a title page, not the marketing home
  // page. An unauthenticated /watch/ redirects to /title/, which still serves
  // the reference — no login required.
  const page = await fetch('https://www.netflix.com/watch/82041768', {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });
  expect(page.ok, `netflix returned HTTP ${page.status}`).toBe(true);
  const html = await page.text();

  const url = html.match(
    /https:\/\/assets\.nflxext\.com\/player\/html\/[^"'\\]+cadmium-playercore[^"'\\]*\.js/,
  )?.[0];
  expect(
    url,
    'Could not find a cadmium-playercore URL on netflix.com.\n' +
      'Netflix may have renamed or relocated its player bundle — which is itself\n' +
      'a signal worth investigating, not just a broken test.',
  ).toBeTruthy();

  const js = await fetch(url!, { headers: { 'user-agent': UA } });
  expect(js.ok, `playercore returned HTTP ${js.status}`).toBe(true);

  cached = { url: url!, body: await js.text() };
  return cached;
}

describe('netflix contract', () => {
  it('the player bundle is still publicly fetchable', async () => {
    const { url, body } = await playerCore();
    expect(body.length).toBeGreaterThan(500_000);
    console.log(`  playercore: ${url.split('/').pop()} (${Math.round(body.length / 1024)} KB)`);
  }, 90_000);

  it('nf.caption-dom — the subtitle container classes still exist', async () => {
    const { body } = await playerCore();
    for (const sel of ['player-timedtext', 'player-timedtext-text-container']) {
      expect(
        body.includes(sel),
        `"${sel}" is gone from Netflix's player.\n${describeFailure('nf.caption-dom')}`,
      ).toBe(true);
    }
  }, 90_000);

  it('nf.timedtexttracks — the manifest fields we read still exist', async () => {
    const { body } = await playerCore();
    for (const field of [
      'timedtexttracks',
      'ttDownloadables',
      'downloadUrls',
      'isNoneTrack',
      'isForcedNarrative',
      'languageDescription',
    ]) {
      expect(
        body.includes(field),
        `"${field}" is gone from Netflix's player.\n${describeFailure('nf.timedtexttracks')}`,
      ).toBe(true);
    }
  }, 90_000);

  it('nf.main-world-csp — records the current CSP so a tightening is visible', async () => {
    const res = await fetch('https://www.netflix.com/', { headers: { 'user-agent': UA } });
    const enforced = res.headers.get('content-security-policy');
    const report = res.headers.get('content-security-policy-report-only');
    console.log(`  CSP enforced:     ${enforced ?? '(none)'}`);
    console.log(`  CSP report-only:  ${(report ?? '(none)').slice(0, 160)}`);

    // Not an assertion about the value — CSP text changes constantly. This
    // exists so the daily log carries it, making a tightening visible in the
    // diff between two runs rather than as a mystery outage.
    expect(res.ok).toBe(true);
  }, 60_000);
});
