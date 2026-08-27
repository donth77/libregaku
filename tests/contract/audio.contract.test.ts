import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

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
