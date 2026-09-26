import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';
import { audioUrlAllowed } from '../../src/audio/pronounce';
import { fetchCheckingHops } from './hosts';

/**
 * The pronunciation endpoint is unofficial. It has served Yomitan, Anki
 * add-ons and others for years, but nobody promised it would keep working —
 * and its failure mode is silence, since we fall through to synthesis and
 * everything still appears to function.
 *
 * So it gets a canary like any other borrowed assumption.
 */

const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';
const PLACEHOLDER_BYTES = 52288;

async function size(kanji: string, kana: string): Promise<number> {
  const res = await fetch(`${JPOD}?${new URLSearchParams({ kanji, kana })}`);
  expect(res.ok, `jpod101 returned HTTP ${res.status}`).toBe(true);
  return (await res.arrayBuffer()).byteLength;
}

describe('audio contract', () => {
  it('audio.jpod101 — every redirect hop is a host the manifest permits', async () => {
    // The endpoint 301s to a CDN. If that CDN is not in host_permissions the
    // content script's fetch fails outright, and the card falls back to
    // synthesis without a word about it.
    const res = await fetchCheckingHops(
      `${JPOD}?${new URLSearchParams({ kanji: '勉強', kana: 'べんきょう' })}`,
      {},
      describeFailure('audio.jpod101'),
    );
    expect(res.ok, `jpod101 returned HTTP ${res.status}`).toBe(true);
    // The service worker checks where a redirect lands against its own list,
    // separately from the manifest. A new CDN has to be on both.
    expect(
      audioUrlAllowed(res.url),
      `${res.url} is not in AUDIO_HOSTS in src/audio/pronounce.ts — the service worker ` +
        `will refuse the recording.\n${describeFailure('audio.jpod101')}`,
    ).toBe(true);
  }, 60_000);

  it('audio.jpod101 — still returns recordings for common vocabulary', async () => {
    for (const [k, r] of [['食べる', 'たべる'], ['勉強', 'べんきょう']] as const) {
      const n = await size(k, r);
      expect(
        n > 512 && n !== PLACEHOLDER_BYTES,
        `${k} returned ${n} bytes.\n${describeFailure('audio.jpod101')}`,
      ).toBe(true);
    }
  }, 60_000);

  it('audio.jpod101 — the missing-word placeholder is still that exact size', async () => {
    // Absence is detected by size, so a change here would make every word look
    // present and play a "not found" clip instead.
    const n = await size('ZZZZ', 'ずずず');
    expect(
      n,
      `The placeholder is now ${n} bytes, not ${PLACEHOLDER_BYTES}. ` +
        `Update JPOD_MISSING_BYTES in src/audio/pronounce.ts.`,
    ).toBe(PLACEHOLDER_BYTES);
  }, 60_000);

  it('audio.jpod101 — still rejects katakana readings, as the code assumes', async () => {
    // If this ever starts working, the hiragana normalisation is redundant
    // rather than load-bearing — worth knowing, not worth breaking over.
    const n = await size('食べる', 'タベル');
    expect(n).toBe(PLACEHOLDER_BYTES);
  }, 60_000);
});
