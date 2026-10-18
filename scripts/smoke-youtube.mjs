// Loads the built extension in Chrome for Testing, plays a YouTube video with
// human Japanese captions, and waits for the overlay to draw tokenized words.
//
//   node scripts/smoke-youtube.mjs [video-id]
//
// Exit codes: 0 the overlay drew; 1 the page was fine and it did not (the
// extension broke, or YouTube changed under it), or the check itself never
// finished; 2 inconclusive — YouTube served a bot check, a consent page, a
// video it would not play here or an ad that never ended, so nothing can be
// said about the extension. CI treats 2 as "try again tomorrow".
//
// Needs a display (xvfb-run in CI): headless Chrome does not run extension
// pages. Run `pnpm build` first.

import { chromium } from 'playwright-core';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ID = process.argv[2] ?? 'uC8Mhixux3Q';
const dist = resolve('dist');
if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/ is not built: run `pnpm build` first');
  process.exit(1);
}

const stage = { page: false, captionsRequested: false, playing: false, overlay: false };

// Each wait below has a limit, but a promise the page never settles has
// none, and CI waited on one for six hours a day until the month's Actions
// minutes were gone. So the run has a limit of its own. Past it the check
// is what broke, which is a failure, not a verdict on YouTube.
const LIMIT_MS = 5 * 60_000;
setTimeout(() => {
  console.log(`FAIL: the check did not finish in ${LIMIT_MS / 60_000} minutes`);
  console.log('stages reached:', JSON.stringify(stage));
  process.exit(1);
}, LIMIT_MS).unref();

const profile = mkdtempSync(join(tmpdir(), 'libregaku-smoke-'));
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  // Defaults to the Chrome for Testing that `playwright-core install chromium` fetches.
  executablePath: process.env.CHROME_PATH || undefined,
  args: [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--no-first-run',
    '--lang=en-US',
  ],
  viewport: { width: 1400, height: 860 },
});

const finish = async (code, why) => {
  console.log(`${code === 0 ? 'PASS' : code === 2 ? 'INCONCLUSIVE' : 'FAIL'}: ${why}`);
  console.log('stages reached:', JSON.stringify(stage));
  // Closing can hang like anything else, and the verdict is already out.
  await Promise.race([context.close().catch(() => {}), new Promise((done) => setTimeout(done, 10_000))]);
  process.exit(code);
};

const page = context.pages()[0] ?? (await context.newPage());
// YouTube answers caption requests from an automated, signed-out browser
// with an empty 200, to its own player as much as to us. That says nothing
// about the extension, so an empty answer is replaced with a recorded track
// and the run goes on: the page, the player and the injection are still
// YouTube's own. A live answer is passed through untouched, and the result
// says which it was. (tests/contract checks the live caption format.)
const LINES = ['今日は友達と一緒に映画を見に行きました。', '日本語の字幕を読むのは楽しいです。'];
const recorded = JSON.stringify({
  events: Array.from({ length: 300 }, (_, i) => ({
    tStartMs: i * 4000,
    dDurationMs: 4000,
    segs: [{ utf8: LINES[i % LINES.length] }],
  })),
});
const sources = new Set();
const captions = () => [...sources].sort().join(' and ') || 'none';
await context.route('**/api/timedtext**', async (route) => {
  stage.captionsRequested = true;
  const url = new URL(route.request().url());
  let live = null;
  try {
    live = await route.fetch();
  } catch {
    // Falls through to the recording, or to an abort below.
  }
  const body = live ? await live.body().catch(() => Buffer.alloc(0)) : Buffer.alloc(0);
  if (live?.ok() && body.length) {
    sources.add('live');
    return route.fulfill({ response: live, body });
  }
  if (url.searchParams.get('fmt') === 'json3' && url.searchParams.get('lang') === 'ja') {
    sources.add('recorded');
    return route.fulfill({ status: 200, contentType: 'application/json; charset=UTF-8', body: recorded });
  }
  return live ? route.fulfill({ response: live, body }) : route.abort();
});

try {
  await page.goto(`https://www.youtube.com/watch?v=${ID}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
} catch (e) {
  await finish(2, `could not load YouTube: ${e}`);
}

if (page.url().includes('consent.')) await finish(2, 'YouTube served a consent page');
const blocked = await page
  .getByText(/confirm you.re not a bot|unusual traffic/i)
  .first()
  .isVisible()
  .catch(() => false);
if (blocked) await finish(2, 'YouTube served a bot check');

try {
  await page.waitForSelector('#movie_player video', { timeout: 30_000 });
} catch {
  await finish(2, 'the player never appeared');
}
stage.page = true;

// The player draws its bot check once it has loaded, after the page text
// above was read, and a video it will not play still has a <video>. YouTube's
// own verdict on the video says whether this browser was ever going to see
// it: the player response's playabilityStatus, which the contract tests read
// too. Without one the run goes on as before.
const playability = await page
  .evaluate(() => {
    const response = document.querySelector('#movie_player')?.getPlayerResponse?.() ?? window.ytInitialPlayerResponse;
    const { status, reason } = response?.playabilityStatus ?? {};
    return status ? { status, reason } : null;
  })
  .catch(() => null);
if (playability && playability.status !== 'OK') {
  await finish(2, `YouTube will not play the video here: ${playability.status}${playability.reason ? ` (${playability.reason})` : ''}`);
}

// A pre-roll ad blocks the video and carries no captions; let it play through.
const adGone = await page
  .waitForFunction(() => !document.querySelector('#movie_player')?.classList.contains('ad-showing'), null, {
    timeout: 60_000,
  })
  .then(() => true, () => false);
if (!adGone) await finish(2, 'an ad was still playing after 60 s');

// play() settles when the video starts, which on a page that will not play
// it is never: it is asked for and not waited on, and whether the video
// plays is read after.
await page.evaluate(() => {
  document.querySelector('video')?.play()?.catch(() => {});
});
await page.waitForTimeout(1500);
stage.playing = await page.evaluate(() => {
  const v = document.querySelector('video');
  return !!v && !v.paused && v.currentTime > 0;
});

// The dictionary may have to download on a fresh profile, so give the first
// line time. A locator pierces open shadow roots; a token is a word the
// segmenter split out.
const token = page.locator('.libregaku-root .primary .t').first();
const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  if (await token.count()) {
    stage.overlay = true;
    const text = (await token.textContent())?.trim();
    await finish(0, `overlay drew its first word: ${text} (captions: ${captions()})`);
  }
  await page.waitForTimeout(500);
}

const hasHost = await page.locator('.libregaku-root').count();
await finish(
  1,
  hasHost
    ? `captions were served (${captions()}) but the overlay drew no words (tokenizer or adapter)`
    : 'the extension never mounted its overlay (injection)',
);
