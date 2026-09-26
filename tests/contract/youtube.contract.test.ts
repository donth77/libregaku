import { describe, expect, it, type TestContext } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Canary tests. These hit the live site, so they are excluded from `pnpm test`
 * and run on a schedule instead — their job is to notice YouTube changing
 * shape, which unit tests structurally cannot.
 */

// Old, stable, heavily-translated. Unlikely to be deleted or lose its captions.
const VIDEO = 'iG9CE55wbtY';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function watchPage(id: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
  });
  expect(res.ok, `YouTube returned HTTP ${res.status}`).toBe(true);
  return res.text();
}

/**
 * YouTube answers datacenter addresses — GitHub's runners among them — with a
 * "confirm you're not a bot" page: a watch page whose player response says
 * LOGIN_REQUIRED and carries no captions. That is not YouTube changing shape,
 * and failing on it kept this canary red every day for a reason nobody could
 * act on, which is as good as not having one. It is reported as inconclusive
 * instead, and the bundle checks below still run.
 */
export function blockedBecause(html: string): string | null {
  const status = html.match(/"playabilityStatus":\{"status":"([A-Z_]+)"/)?.[1];
  if (status && status !== 'OK') return `the player response says ${status}`;
  if (/consent\.youtube\.com|confirm you(?:'|’|\\u0027|\\u2019)re not a bot/i.test(html)) {
    return 'YouTube served a consent or bot-check page';
  }
  return null;
}

function inconclusive(ctx: TestContext, why: string): never {
  // A GitHub annotation, so an inconclusive day is visible on the run.
  console.log(`::warning title=YouTube canary inconclusive::${why} — this runner cannot see a real watch page`);
  return ctx.skip() as never;
}

async function realWatchPage(ctx: TestContext): Promise<string> {
  const html = await watchPage(VIDEO);
  const why = blockedBecause(html);
  if (why) inconclusive(ctx, why);
  return html;
}

describe('youtube contract', () => {
  it('yt.player-response — the page still embeds a caption track list', async (ctx) => {
    const html = await realWatchPage(ctx);
    const found = /"captionTracks":\[/.test(html);
    expect(found, describeFailure('yt.player-response')).toBe(true);
  }, 30_000);

  it('yt.track-fields — tracks still carry baseUrl, languageCode, and kind', async (ctx) => {
    const html = await realWatchPage(ctx);
    const m = html.match(/"captionTracks":(\[.*?\])/);
    expect(m, describeFailure('yt.player-response')).toBeTruthy();

    const tracks = JSON.parse(m![1]!) as Array<Record<string, unknown>>;
    expect(tracks.length, describeFailure('yt.track-fields')).toBeGreaterThan(0);

    for (const t of tracks) {
      expect(typeof t.baseUrl, describeFailure('yt.track-fields')).toBe('string');
      expect(typeof t.languageCode, describeFailure('yt.track-fields')).toBe('string');
    }

    // The human/auto distinction is what `check-captions` and track selection rely on.
    const kinds = new Set(tracks.map((t) => t.kind ?? 'human'));
    expect([...kinds].every((k) => k === 'human' || k === 'asr'), describeFailure('yt.track-fields')).toBe(true);
  }, 30_000);

  it('yt.track-fields — this reference video still has a human Japanese track', async (ctx) => {
    const html = await realWatchPage(ctx);
    const m = html.match(/"captionTracks":(\[.*?\])/);
    const tracks = JSON.parse(m![1]!) as Array<{ languageCode?: string; kind?: string }>;
    const ja = tracks.find((t) => t.languageCode?.startsWith('ja') && t.kind !== 'asr');
    expect(
      ja,
      `Reference video ${VIDEO} lost its human Japanese track. Pick a new one; this is\n` +
        `a fixture problem, not necessarily a YouTube change.`,
    ).toBeTruthy();
  }, 30_000);

  it('yt.player-response — the response names its own video, which is how a list is matched to the page', async (ctx) => {
    const html = await realWatchPage(ctx);
    expect(html.includes(`"videoDetails":{"videoId":"${VIDEO}"`), describeFailure('yt.player-response')).toBe(true);
  }, 30_000);

  /*
   * The player bundle, which a bot-check page still links to. Names surviving
   * in the code is a weaker signal than the behaviour itself — the Netflix
   * canary stayed green through a rename that way — but a rename of any of
   * these does turn it red, and it is the part that can run everywhere.
   */
  it('yt.player-api, yt.ad-showing, yt.controls, yt.caption-dom — the player still names what we drive', async (ctx) => {
    const html = await watchPage(VIDEO);
    const js = html.match(/"jsUrl":"([^"]+\/base\.js)"/)?.[1];
    if (!js) inconclusive(ctx, 'the watch page named no player script');

    const base = await (await fetch(new URL(js, 'https://www.youtube.com').href, { headers: { 'user-agent': UA } })).text();
    const expectations: Array<[string, string[]]> = [
      ['yt.player-api', ['getPlayerResponse', 'loadModule', '"tracklist"']],
      ['yt.player-response', ['playerCaptionsTracklistRenderer', 'captionTracks']],
      ['yt.ad-showing', ['ad-showing']],
      ['yt.controls', ['ytp-chrome-bottom']],
    ];
    for (const [id, names] of expectations) {
      for (const name of names) {
        expect(base.includes(name), `${describeFailure(id)}\n  no longer in ${js}: ${name}`).toBe(true);
      }
    }

    // Caption rendering is a module the player loads on demand, beside base.js.
    const module = js.replace(/base\.js$/, 'captions.js');
    const captions = await (await fetch(new URL(module, 'https://www.youtube.com').href, { headers: { 'user-agent': UA } })).text();
    for (const name of ['ytp-caption-window-container', 'ytp-caption-segment']) {
      expect(captions.includes(name), `${describeFailure('yt.caption-dom')}\n  no longer in ${module}: ${name}`).toBe(true);
    }
  }, 60_000);

  it('recognises a bot-check page, so it is never mistaken for a broken site', () => {
    expect(blockedBecause('{"playabilityStatus":{"status":"LOGIN_REQUIRED","reason":"Sign in"}')).toMatch(/LOGIN_REQUIRED/);
    expect(blockedBecause('{"playabilityStatus":{"status":"OK"}')).toBeNull();
    expect(blockedBecause('<a href="https://consent.youtube.com/m?continue=">')).toMatch(/consent/);
  });
});
