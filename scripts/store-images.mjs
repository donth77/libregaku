// The Chrome Web Store's images: the small promo tile (440×280), the marquee
// (1400×560), and screenshots (1280×800) of the built extension on a YouTube
// video, written to docs/store/.
//
//   pnpm build && node scripts/store-images.mjs [video-id]
//
// The tile and the marquee are drawn from brand/. The screenshots are the
// extension itself, in Chrome for Testing as scripts/smoke-youtube.mjs runs
// it, with the video blurred so that no show can be recognised in a listing.
// YouTube often answers a signed-out, automated browser's caption requests
// with nothing; the lines below stand in for the video's own then, as they do
// in the smoke test. Needs a display: headless Chrome runs no extension pages.

import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ID = process.argv[2] ?? 'uC8Mhixux3Q';
const OUT = resolve('docs/store');
const dist = resolve('dist');
if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/ is not built: run `pnpm build` first');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const NAVY = '#0D111C';
const CORAL = '#E5806C';
const AMBER = '#D9A64A';
const PAPER = '#F2F5FC';
const FONT = `system-ui, 'Segoe UI', 'Yu Gothic UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif`;
const logo = readFileSync('brand/libregaku-logo-horizontal-color-on-dark.svg', 'utf8');

/** A line of subtitle as the overlay draws it: unknown words underlined coral, words being learned amber. */
const line = (size) => `
  <div class="line" style="font-size:${size}px">
    <ruby>週末<rt>しゅうまつ</rt></ruby>は<span class="u" style="--c:${CORAL}"><ruby>海<rt>うみ</rt></ruby></span>に<span class="u" style="--c:${AMBER}"><ruby>行<rt>い</rt></ruby>きたい</span>な
  </div>`;

const page = (width, height, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: ${NAVY}; color: ${PAPER}; font-family: ${FONT}; }
  .logo svg { display: block; width: 100%; height: auto; }
  .line { display: inline-block; padding: .25em .6em .3em; border-radius: .3em; background: rgba(0,0,0,.55); font-weight: 600; line-height: 1.9; letter-spacing: .02em; }
  .line rt { font-size: .42em; color: #B4BDD4; font-weight: 500; }
  .u { text-decoration: underline; text-decoration-color: var(--c); text-decoration-thickness: .1em; text-underline-offset: .22em; }
  .card { background: #151B2B; border: 1px solid #263048; border-radius: 12px; padding: 18px 20px; width: 300px; box-shadow: 0 18px 40px rgba(0,0,0,.45); }
  .card .hw { font-size: 34px; font-weight: 700; }
  .card .rd { color: #B4BDD4; font-size: 15px; margin-inline-start: 10px; }
  .card .gl { margin-top: 8px; font-size: 16px; line-height: 1.5; color: #D5DBEA; }
  .card .add { margin-top: 14px; display: inline-block; background: ${CORAL}; color: ${NAVY}; font-weight: 700; font-size: 14px; padding: 8px 14px; border-radius: 8px; }
</style></head><body>${body}</body></html>`;

const tile = page(440, 280, `
  <div style="padding:28px 30px">
    <div class="logo" style="width:190px">${logo}</div>
    <div style="margin-top:18px;font-size:21px;font-weight:650;line-height:1.3">Learn a language from<br>the shows you watch</div>
    <div style="margin-top:22px">${line(25)}</div>
  </div>`);

const marquee = page(1400, 560, `
  <div style="display:flex;align-items:center;height:100%;padding:0 90px;gap:80px">
    <div style="flex:1">
      <div class="logo" style="width:330px">${logo}</div>
      <div style="margin-top:34px;font-size:44px;font-weight:700;line-height:1.2">Learn a language from<br>the shows you watch</div>
      <div style="margin-top:22px;font-size:21px;color:#B4BDD4;line-height:1.5">Clickable subtitles on YouTube, Netflix and more.<br>Look a word up, and make a card in your own Anki.</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:22px">
      ${line(46)}
      <div class="card" style="margin-inline-start:150px">
        <div><span class="hw">海</span><span class="rd">うみ</span></div>
        <div class="gl">sea; ocean; waters</div>
        <div class="add">Add to Anki</div>
      </div>
    </div>
  </div>`);

/** Lines that stand in for the video's own where YouTube sends this browser none: a short scene, written for this. */
const LINES = [
  '駅の近くに新しい喫茶店ができたらしいよ。',
  'へえ、知らなかった。どんな店？',
  '古い本がたくさん置いてあって、静かなんだって。',
  'いいね。今度の週末、一緒に行ってみない？',
  '土曜日は雨が降るかもしれないけど、大丈夫？',
  '雨なら、なおさら喫茶店日和じゃない。',
  'たしかに。じゃあ、十時に駅で待ち合わせしよう。',
  '朝ごはんは食べないで来てね。',
  'モーニングのセットがおいしいらしいから。',
  '楽しみだな。久しぶりにゆっくり話せるね。',
  '最近ずっと忙しかったもんね。',
  'うん。たまには休まないと。',
];
const recorded = JSON.stringify({
  events: LINES.map((utf8, i) => ({ tStartMs: i * 4000, dDurationMs: 3800, segs: [{ utf8 }] })),
});

const profile = mkdtempSync(join(tmpdir(), 'libregaku-store-'));
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  executablePath: process.env.CHROME_PATH || undefined,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', '--lang=en-US'],
  viewport: { width: 1280, height: 800 },
});
const done = async (code, why) => {
  if (why) console.log(why);
  await Promise.race([context.close().catch(() => {}), new Promise((r) => setTimeout(r, 10_000))]);
  process.exit(code);
};
setTimeout(() => done(1, 'gave up after 6 minutes'), 6 * 60_000).unref();

// The tile and the marquee.
const art = await context.newPage();
for (const [name, html, width, height] of [['promo-small-440x280', tile, 440, 280], ['marquee-1400x560', marquee, 1400, 560]]) {
  await art.setViewportSize({ width, height });
  await art.setContent(html);
  await art.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`wrote docs/store/${name}.png`);
}
await art.close();

// The screenshots. The extension opens its settings on install; a tab of our own is used for the video.
await new Promise((r) => setTimeout(r, 3000));
const tab = await context.newPage();
let sources = new Set();
await context.route('**/api/timedtext**', async (route) => {
  const url = new URL(route.request().url());
  let live = null;
  try { live = await route.fetch(); } catch {}
  const body = live ? await live.body().catch(() => Buffer.alloc(0)) : Buffer.alloc(0);
  if (live?.ok() && body.length) { sources.add('live'); return route.fulfill({ response: live, body }); }
  if (url.searchParams.get('fmt') === 'json3' && url.searchParams.get('lang') === 'ja') {
    sources.add('recorded');
    return route.fulfill({ status: 200, contentType: 'application/json; charset=UTF-8', body: recorded });
  }
  return live ? route.fulfill({ response: live, body }) : route.abort();
});
await tab.goto(`https://www.youtube.com/watch?v=${ID}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
await tab.waitForSelector('#movie_player video', { timeout: 30_000 }).catch(() => done(2, 'the player never appeared'));
await tab.waitForFunction(() => !document.querySelector('#movie_player')?.classList.contains('ad-showing'), null, { timeout: 90_000 })
  .catch(() => done(2, 'an ad was still playing'));
// The listing shows the extension, not someone's video: the picture, and whatever the player says over it
// (YouTube often will not play to this browser), give way to a plain evening sky, and the player's own
// controls are hidden. The player then fills the screen, so nothing of the page around it shows.
await tab.addStyleTag({ content: `
  #movie_player video { opacity: 0 !important; }
  #movie_player { background: radial-gradient(120% 90% at 70% 15%, #3c4f7a 0%, #22304f 38%, #121a2c 75%) !important; }
  #movie_player .ytp-error, #movie_player .ytp-spinner, #movie_player .ytp-chrome-bottom, #movie_player .ytp-chrome-top,
  #movie_player .ytp-gradient-bottom, #movie_player .ytp-gradient-top, #movie_player .ytp-pause-overlay,
  #movie_player .ytp-cued-thumbnail-overlay, #movie_player .ytp-large-play-button, #movie_player .ytp-watermark,
  #movie_player .ytp-paid-content-overlay, #movie_player .ytp-ce-element { display: none !important; }` });
await tab.evaluate(() => document.querySelector('video')?.play()?.catch(() => {}));

const word = tab.locator('.libregaku-root .primary .t');
const until = Date.now() + 180_000;
while (!(await word.count()) && Date.now() < until) await tab.waitForTimeout(500);
if (!(await word.count())) await done(1, 'the overlay drew no words');
console.log(`captions: ${[...sources].join(' and ') || 'none'}`);

// Let the analyser and the dictionary finish loading, then hold the first line.
await tab.waitForTimeout(60_000);
await tab.evaluate(() => {
  const v = document.querySelector('video');
  if (v) { v.pause(); v.currentTime = 0.5; }
});
await tab.locator('#movie_player').click({ position: { x: 20, y: 20 } }).catch(() => {});
await tab.keyboard.press('f');
await tab.waitForTimeout(2500);
// A notice that a second line could not be found (this video has no English track) is not what the listing is about.
for (const dismiss of await tab.getByText(/^dismiss$/i).all()) await dismiss.click().catch(() => {});
await tab.mouse.move(1270, 790);
await tab.waitForTimeout(1500);

const shot = async (name) => {
  // No focus ring on the word last clicked, and the bar over the player and any notice gone again.
  await tab.evaluate(() => {
    let at = document.activeElement;
    while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement;
    if (at && 'blur' in at) at.blur();
  });
  await tab.mouse.move(400, 320);
  await tab.waitForTimeout(5000);
  await tab.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`wrote docs/store/${name}.png`);
};
const button = (name) => tab.getByRole('button', { name, exact: true }).first();
const wordOf = (text) => word.filter({ hasText: text }).first();

// A few words marked known, as a learner's would be: their underlines go, and the rest are what is left to learn.
// The popup that is open: a closed one stays in the page, hidden.
const markKnown = tab.locator('.libregaku-popup [data-tip="Mark known"]:visible').first();
for (const known of ['駅', '近く', '新しい']) {
  if (!(await wordOf(known).count())) continue;
  await wordOf(known).click();
  await tab.waitForTimeout(1200);
  await markKnown.click().catch(() => console.log(`could not mark ${known} known`));
  await tab.waitForTimeout(800);
  await tab.keyboard.press('Escape');
  await tab.waitForTimeout(500);
}

// 1: the line, with the transcript beside it.
if (await button('Show the transcript').isVisible().catch(() => false)) {
  await button('Show the transcript').click();
  await tab.waitForTimeout(2500);
}
await tab.mouse.move(640, 300);
await tab.waitForTimeout(1500);
await shot('1-transcript');

// 2: a word looked up.
await ((await wordOf('喫茶店').count()) ? wordOf('喫茶店') : word.nth(Math.min(2, (await word.count()) - 1))).click();
await tab.waitForTimeout(2500);
await shot('2-lookup');

// 3: the panel's settings.
await tab.keyboard.press('Escape');
await tab.locator('.libregaku-sidebar [aria-label="Settings"]').first().click().catch(() => console.log('no Settings button found'));
await tab.waitForTimeout(2500);
await tab.mouse.move(640, 300);
await shot('3-settings');

await done(0);
