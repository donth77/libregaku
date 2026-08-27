import { describe, expect, it } from 'vitest';
import { toTokens } from '../lindera';

describe('toTokens', () => {
  const line = '彼女は日本語を勉強している';

  it('maps analysed surfaces back to UTF-16 offsets in the original text', () => {
    const toks = toTokens(line, [
      { surface: '彼女', lemma: '彼女', reading: 'カノジョ', pos: '名詞' },
      { surface: 'は', pos: '助詞' },
      { surface: '日本語', lemma: '日本語', reading: 'ニホンゴ', pos: '名詞' },
    ]);
    for (const t of toks) expect(line.slice(t.start, t.end)).toBe(t.surface);
    expect(toks[0]?.start).toBe(0);
    expect(toks[2]?.surface).toBe('日本語');
  });

  it('marks particles as function words, not vocabulary', () => {
    const toks = toTokens(line, [
      { surface: '彼女', pos: '名詞' },
      { surface: 'は', pos: '助詞' },
    ]);
    expect(toks[0]?.content).toBe(true);
    expect(toks[1]?.content).toBe(false);
  });

  it('carries lemma and reading through', () => {
    const [t] = toTokens('食べる', [
      { surface: '食べる', lemma: '食べる', reading: 'タベル', pos: '動詞' },
    ]);
    expect(t?.lemma).toBe('食べる');
    expect(t?.reading).toBe('タベル');
  });

  it('skips a surface it cannot find rather than misaligning the rest', () => {
    const toks = toTokens('あいう', [
      { surface: 'あ' },
      { surface: 'ZZZ' },   // analyser normalised something away
      { surface: 'う' },
    ]);
    expect(toks.map((t) => t.surface)).toEqual(['あ', 'う']);
    expect(toks[1]?.start).toBe(2);
  });

  it('does not match an earlier duplicate twice', () => {
    const toks = toTokens('ははは', [{ surface: 'は' }, { surface: 'は' }, { surface: 'は' }]);
    expect(toks.map((t) => t.start)).toEqual([0, 1, 2]);
  });
});
