import { describe, expect, it } from 'vitest';
import { mergeMorphemes, type Morpheme } from '../merge';

const m = (surface: string, pos?: string, pos1?: string, lemma?: string, reading?: string): Morpheme =>
  ({ surface, pos, pos1, lemma, reading });

describe('mergeMorphemes', () => {
  it('fuses a verb with its past auxiliary — the 来た case', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('来た');
    expect(out[0]?.lemma).toBe('来る');
    expect(out[0]?.reading).toBe('キタ');
    expect(out[0]?.parts).toEqual(['来', 'た']);
  });

  it('fuses a suru-noun into its dictionary form', () => {
    const out = mergeMorphemes([
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('て', '助詞', '接続助詞', 'て', 'テ'),
      m('いる', '動詞', '非自立', 'いる', 'イル'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('勉強している');
    expect(out[0]?.lemma).toBe('勉強する');
  });

  it('fuses polite past onto a verb stem', () => {
    const out = mergeMorphemes([
      m('食べ', '動詞', '自立', '食べる', 'タベ'),
      m('まし', '助動詞', '*', 'ます', 'マシ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.surface).toBe('食べました');
    expect(out[0]?.lemma).toBe('食べる');
  });

  it('keeps particles as their own tokens', () => {
    const out = mergeMorphemes([
      m('彼女', '名詞', '代名詞', '彼女', 'カノジョ'),
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('日本語', '名詞', '一般', '日本語', 'ニホンゴ'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['彼女', 'は', '日本語']);
    expect(out[1]?.content).toBe(false);
  });

  it('attaches a prefix to the following noun', () => {
    const out = mergeMorphemes([
      m('お', '接頭詞', '名詞接続', 'お', 'オ'),
      m('金', '名詞', '一般', '金', 'カネ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('お金');
  });

  it('attaches a suffix', () => {
    const out = mergeMorphemes([
      m('私', '名詞', '代名詞', '私', 'ワタシ'),
      m('たち', '名詞', '接尾', 'たち', 'タチ'),
    ]);
    expect(out[0]?.surface).toBe('私たち');
  });

  it('does not let a particle absorb what follows it', () => {
    const out = mergeMorphemes([
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['は', 'た']);
  });

  it('drops the reading when any morpheme lacks one, rather than inventing it', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', undefined),
    ]);
    expect(out[0]?.reading).toBeUndefined();
  });

  it('reassembles to the original text', () => {
    const src = [
      m('彼女', '名詞', '代名詞', '彼女', 'カノジョ'),
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ];
    expect(mergeMorphemes(src).map((t) => t.surface).join('')).toBe(
      src.map((x) => x.surface).join(''),
    );
  });
});

describe('copula after a noun', () => {
  it('keeps ワールド and です apart', () => {
    // です is a copula, not an inflection of the noun — two lookups.
    const out = mergeMorphemes([
      m('ワールド', '名詞', '一般', 'ワールド', 'ワールド'),
      m('です', '助動詞', '*', 'です', 'デス'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['ワールド', 'です']);
  });

  it('keeps 学生 and でし + た apart from the noun', () => {
    const out = mergeMorphemes([
      m('学生', '名詞', '一般', '学生', 'ガクセイ'),
      m('でし', '助動詞', '*', 'です', 'デシ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.surface).toBe('学生');
    expect(out.length).toBeGreaterThan(1);
  });

  it('still attaches auxiliaries to a verb', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('来た');
  });

  it('still attaches auxiliaries to an adjective', () => {
    const out = mergeMorphemes([
      m('高', '形容詞', '自立', '高い', 'タカ'),
      m('かっ', '助動詞', '*', 'た', 'カッ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
  });

  it('attaches an auxiliary once a suru-noun has become verbal', () => {
    // 勉強 heads a noun group until する joins it; then た belongs.
    const out = mergeMorphemes([
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('勉強した');
    expect(out[0]?.lemma).toBe('勉強する');
  });
});
