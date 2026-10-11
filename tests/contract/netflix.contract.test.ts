import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Netflix canaries.
 *
 * Netflix cannot be driven end-to-end in CI — playback needs an authenticated
 * account and Widevine, which headless Chromium lacks. But it does not need to
 * be: Netflix ships its player as a public, unauthenticated JS bundle
 * (cadmium-playercore), and the subtitle classes and manifest fields this
 * extension reads are literal strings inside it. If Netflix renames one, it
 * vanishes from the bundle, and that is detectable in seconds without logging in.
 *
 * What this catches: renamed subtitle classes, renamed manifest fields.
 * What it does not: behavioural change where the name survives but its meaning
 * shifts. For that there is no substitute for watching something.
 *
 * Nor what lives in Netflix's UI app rather than its player, which this bundle
 * does not contain: the player-root and title selectors, the bottom control
 * bar, and the netflix.appContext…videoPlayer API the page hook seeks with.
 * Those have no canary; a break shows only as the runtime warnings they log.
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

  /**
   * A weak canary, and worth saying why. It asserts these names appear in the
   * player bundle, which is not the same as the manifest still using them:
   * Netflix moved the track array from `timedtexttracks` to
   * `result.textTracks` while both names stayed in the bundle, so this stayed
   * green through an outage. It only catches a name disappearing outright.
   *
   * It used to include `textTracks`, which could never fail: that is also the
   * standard HTMLMediaElement property, so any video player's bundle contains
   * it whatever the manifest does. Every name below is one only manifest
   * handling has a reason to mention.
   *
   * What pins the shape is the unit tests in src/adapters/__tests__ — and
   * those fixtures are hand-reduced from what the adapter reads, not recorded
   * manifests, so they pin our reading rather than Netflix's format. At
   * runtime, the page hook warns when a manifest's tracks come only in formats
   * we cannot read, and the adapter warns when no manifest ever matches the
   * /watch/ id.
   */
  it('nf.textTracks — the manifest fields we read still exist', async () => {
    const { body } = await playerCore();
    for (const field of [
      'rawTrackType',
      'isForcedNarrative',
      'isNoneTrack',
      'isImageBased',
      'languageDescription',
      'downloadables',
      'imsc1.1',
    ]) {
      expect(
        body.includes(field),
        `"${field}" is gone from Netflix's player.\n${describeFailure('nf.textTracks')}`,
      ).toBe(true);
    }
  }, 90_000);

  /**
   * Names again, and weak for the same reason. What the extension relies on
   * is behaviour no signed-out request shows: a title's manifest sends the
   * files of a few tracks and names the rest, and the player fetches a named
   * track's files when it is put on that track. These are the names that
   * machinery goes by in the bundle. One vanishing says Netflix has reworked
   * it; all of them staying says only that it has not been renamed.
   */
  it('nf.track-request — the player still fetches a track it was not sent', async () => {
    const { body } = await playerCore();
    for (const name of [
      'supportsPartialHydration',
      'requiredTextTrackId',
      'hydrated',
      'getTimedTextTrackList',
      'getTimedTextTrack',
      'setTimedTextTrack',
      'getMovieId',
    ]) {
      expect(
        body.includes(name),
        `"${name}" is gone from Netflix's player.\n${describeFailure('nf.track-request')}`,
      ).toBe(true);
    }
  }, 90_000);

  /**
   * The formats the player's own manifest request is recognised by, and the
   * one added to it. Whether Netflix still answers the added one with a text
   * file is not something the bundle can say.
   */
  it('nf.text-profile — the subtitle formats a manifest request names still exist', async () => {
    const { body } = await playerCore();
    for (const format of ['webvtt-lssdh-ios8', 'nflx-cmisc', 'dfxp-ls-sdh', 'simplesdh', 'imsc1.1']) {
      expect(
        body.includes(format),
        `"${format}" is gone from Netflix's player.\n${describeFailure('nf.text-profile')}`,
      ).toBe(true);
    }
  }, 90_000);

  /**
   * Informational, and named for it: this asserts nothing about injection.
   * Whether Chrome lets a manifest-declared MAIN-world script run under
   * Netflix's CSP cannot be observed without a browser. The extension no longer
   * depends on the answer — the hook is both declared and injected by the
   * service worker, and installs once — so this only puts the policy in the
   * daily log, where a change shows up as a diff.
   */
  it('nf.main-world-csp — logs the CSP for the daily diff (informational)', async () => {
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
