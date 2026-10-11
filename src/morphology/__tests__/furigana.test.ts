import { describe, expect, it } from 'vitest';
import { furigana, toHiragana } from '../furigana';

describe('toHiragana', () => {
  it('converts katakana and leaves everything else alone', () => {
    expect(toHiragana('タベル')).toBe('たべる');
    expect(toHiragana('食べる')).toBe('食べる');
    expect(toHiragana('ー')).toBe('ー');
  });
});

describe('furigana', () => {
  it('annotates a kanji stem and leaves okurigana bare', () => {
    expect(furigana('食べる', 'タベル')).toEqual([
      { text: '食', ruby: 'た' },
      { text: 'べる' },
    ]);
  });

  it('handles several kanji runs separated by kana', () => {
    expect(furigana('取り引き', 'トリヒキ')).toEqual([
      { text: '取', ruby: 'と' },
      { text: 'り' },
      { text: '引', ruby: 'ひ' },
      { text: 'き' },
    ]);
  });

  it('annotates an adjacent-kanji run as a whole, since it cannot be split', () => {
    expect(furigana('立場', 'タチバ')).toEqual([{ text: '立場', ruby: 'たちば' }]);
  });

  it('handles a leading kana before kanji', () => {
    expect(furigana('お金', 'オカネ')).toEqual([
      { text: 'お' },
      { text: '金', ruby: 'かね' },
    ]);
  });

  it('returns bare text when there is no kanji', () => {
    expect(furigana('たべる', 'タベル')).toEqual([{ text: 'たべる' }]);
    expect(furigana('ラーメン', 'ラーメン')).toEqual([{ text: 'ラーメン' }]);
  });

  it('returns bare text when no reading is available', () => {
    expect(furigana('食べる')).toEqual([{ text: '食べる' }]);
  });

  it('falls back to whole-word ruby rather than mis-aligning', () => {
    // Reading that cannot be anchored against the okurigana.
    expect(furigana('食べる', 'タペヨ')).toEqual([{ text: '食べる', ruby: 'たぺよ' }]);
  });

  it('gives every kanji run at least one mora', () => {
    const segs = furigana('日本語', 'ニホンゴ');
    expect(segs).toEqual([{ text: '日本語', ruby: 'にほんご' }]);
  });

  it('reassembles to the original surface in every case', () => {
    for (const [s, r] of [['食べる', 'タベル'], ['取り引き', 'トリヒキ'], ['立場', 'タチバ'], ['お金', 'オカネ']]) {
      expect(furigana(s!, r).map((x) => x.text).join('')).toBe(s);
    }
  });
});

describe('stretched words', () => {
  it('aligns as though the stretch mark were not there, and keeps it where it was', () => {
    expect(furigana('凄〜い', 'スゴイ')).toEqual([{ text: '凄', ruby: 'すご' }, { text: '〜' }, { text: 'い' }]);
    expect(furigana('可愛い～', 'カワイイ')).toEqual([...furigana('可愛い', 'カワイイ'), { text: '～' }]);
    expect(furigana('行こ〜〜', 'イコ')).toEqual([{ text: '行', ruby: 'い' }, { text: 'こ' }, { text: '〜〜' }]);
    expect(furigana('は〜い', 'ハイ')).toEqual([{ text: 'は〜い' }]);
  });
});
