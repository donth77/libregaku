import { describe, expect, it } from 'vitest';
import { toTokens } from '../../src/morphology/lindera';
import { furigana } from '../../src/morphology/furigana';

describe('来た end to end', () => {
  it('becomes one token with one reading and one underline', () => {
    const toks = toTokens('来た', [
      { surface: '来', pos: '動詞', pos1: '自立', lemma: '来る', reading: 'キ' },
      { surface: 'た', pos: '助動詞', lemma: 'た', reading: 'タ' },
    ]);
    expect(toks).toHaveLength(1);
    expect(toks[0]).toMatchObject({
      surface: '来た', lemma: '来る', reading: 'キタ', parts: ['来', 'た'], start: 0, end: 2,
    });
    // Ruby sits over the kanji only.
    expect(furigana(toks[0]!.surface, toks[0]!.reading)).toEqual([
      { text: '来', ruby: 'き' },
      { text: 'た' },
    ]);
  });
});
