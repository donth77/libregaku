import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Disney+ canaries.
 *
 * Like Netflix, Disney+ cannot be played in CI: it needs an account and
 * Widevine. But /home serves the app's shell to anyone, and the player is one
 * of the chunks that shell loads lazily (dwp-<hash>.js at the time of
 * writing). The element names and the clock field the extension reads are
 * literal strings in it, so a rename shows up here without logging in.
 *
 * The chunks are found by following the shell's references rather than by
 * name, so the player moving to a differently named chunk does not turn this
 * red by itself.
 *
 * What this catches: a renamed player element, caption region, caption class
 * family or playhead field.
 * What it does not, and cannot without playing something:
 *   - dp.master-playlist, dp.media-hosts, dp.vtt-segments. The playlists exist
 *     only for a signed-in playback session. src/adapters/__tests__ pins how
 *     we read them; nothing checks that Disney+ still writes them that way.
 *   - the exact caption wrapper class (.hive-subtitle-renderer-wrapper), which
 *     is not a literal in the bundle. Only its family prefix is checked.
 *   - any change of meaning where the name survives, as with Netflix.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const ASSETS = /https:\/\/prod-static\.disney-plus\.net\/[A-Za-z0-9/_.-]+\/assets\//;
const CHUNK = /[A-Za-z0-9_.~-]+-[A-Za-z0-9_-]{8}\.js/g;
/** The shell is about 35 chunks; well past that, something else is being crawled. */
const LIMIT = 120;

let cached: Promise<{ chunks: number; body: string }> | null = null;

/** Every script the app shell loads, followed through its chunks' references, as one text. */
function app(): Promise<{ chunks: number; body: string }> {
  cached ??= (async () => {
    const page = await fetch('https://www.disneyplus.com/home', {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    expect(page.ok, `disneyplus.com/home returned HTTP ${page.status}`).toBe(true);
    const html = await page.text();

    const base = html.match(ASSETS)?.[0];
    expect(
      base,
      'Could not find the app\'s script folder on disneyplus.com/home.\n' +
        'Disney+ may have moved its bundles — worth a look in itself, not just a broken test.',
    ).toBeTruthy();

    const bodies = new Map<string, string>();
    let wanted = new Set(html.match(CHUNK) ?? []);
    while (wanted.size && bodies.size < LIMIT) {
      const names = [...wanted].filter((n) => !bodies.has(n)).slice(0, LIMIT - bodies.size);
      const fetched = await Promise.all(
        names.map(async (name) => {
          const res = await fetch(base + name, { headers: { 'user-agent': UA } });
          // A name the pattern matched that is not one of this folder's chunks.
          return [name, res.ok ? await res.text() : ''] as const;
        }),
      );
      wanted = new Set();
      for (const [name, body] of fetched) {
        bodies.set(name, body);
        for (const next of body.match(CHUNK) ?? []) if (!bodies.has(next)) wanted.add(next);
      }
    }
    return { chunks: bodies.size, body: [...bodies.values()].join('\n') };
  })();
  return cached;
}

function expectNames(body: string, names: string[], id: string): void {
  for (const name of names) {
    expect(body.includes(name), `"${name}" is gone from Disney+'s app.\n${describeFailure(id)}`).toBe(true);
  }
}

describe('disney contract', () => {
  it('the app and its player are still publicly fetchable', async () => {
    const { chunks, body } = await app();
    // The player alone is several megabytes; the shell without it is not.
    expect(body.length, 'the crawl no longer reaches the player chunk').toBeGreaterThan(3_000_000);
    console.log(`  disney+ app: ${chunks} chunks (${Math.round(body.length / 1024)} KB)`);
  }, 120_000);

  it('dp.clock — the player element and its playhead field still exist', async () => {
    const { body } = await app();
    expectNames(body, ['disney-web-player', 'playheadPositionMs'], 'dp.clock');
  }, 120_000);

  it('dp.caption-dom — the caption region and its class family still exist', async () => {
    const { body } = await app();
    expectNames(body, ['timed-text-override-region', 'hive-subtitle-renderer'], 'dp.caption-dom');
  }, 120_000);
});
