import { describe, expect, it } from 'vitest';
import { fromUnidic, kanaReading } from '../unidic';

/** Rows as lindera-unidic 6.0.0 gives them (scripts/compare-unidic.mjs, SHOW=). */
const row = (surface: string, details: string): { surface: string; details: string[] } => ({ surface, details: details.split(',') });

describe("UniDic's words, as the merge rules read them", () => {
  it('names a verb and its ending as IPADIC does, with the form 連用形', () => {
    const [stem, ta] = fromUnidic([
      row('食べ', '動詞,一般,*,*,下一段-バ行,連用形-一般,タベル,食べる,食べ,タベ,食べる,タベル,和,*,*,*,*'),
      row('た', '助動詞,*,*,*,助動詞-タ,終止形-一般,タ,た,た,タ,た,タ,和,*,*,*,*'),
    ]);
    expect(stem).toEqual({
      surface: '食べ', pos: '動詞', pos1: '自立', lemma: '食べる', reading: 'タベ', conjForm: '連用形',
      // How it conjugates, as IPADIC names it: 下一段-バ行 is 一段.
      conjType: '一段',
      // What only UniDic says of a word: the reading of the word it takes it for, and that it is a word of Japanese's own.
      lexeme: 'タベル', native: true,
    });
    expect([ta?.pos, ta?.lemma, ta?.conjForm]).toEqual(['助動詞', 'た', '基本形']);
  });

  it('says which word it takes a word for, and whether it is one of Japanese\'s own: 何 said ナン is ナニ; 金 is きん from Chinese', () => {
    const [nan, kin] = fromUnidic([
      row('何', '代名詞,*,*,*,*,*,ナニ,何,何,ナン,何,ナン,和,*,*,*,*'),
      row('金', '名詞,普通名詞,一般,*,*,*,キン,金,金,キン,金,キン,漢,*,*,*,*'),
    ]);
    expect([nan?.reading, nan?.lexeme, nan?.native]).toEqual(['ナン', 'ナニ', true]);
    expect([kin?.reading, kin?.lexeme, kin?.native]).toEqual(['キン', 'キン', undefined]);
    // 大勢, おおぜい: おお is Japanese's own, and the word counts as one.
    const [crowd] = fromUnidic([row('大勢', '名詞,普通名詞,一般,*,*,*,オオゼイ,大勢,大勢,オーゼー,大勢,オーゼー,混,*,*,*,*')]);
    expect([crowd?.reading, crowd?.native]).toEqual(['オオゼイ', true]);
  });

  it('writes the dictionary form as it is written: する, not 為る; やばい for ヤバい', () => {
    const [suru] = fromUnidic([row('し', '動詞,非自立可能,*,*,サ行変格,連用形-一般,スル,為る,し,シ,する,スル,和,*,*,*,*')]);
    expect(suru?.lemma).toBe('する');
    const [yabai] = fromUnidic([row('ヤバい', '形容詞,一般,*,*,形容詞,終止形-一般,ヤバイ,やばい,ヤバい,ヤバイ,ヤバい,ヤバイ,和,*,*,*,*')]);
    expect(yabai?.lemma).toBe('やばい');
  });

  it('takes ない after a stem for the negative ending, and そう on a stem for "seems"', () => {
    const words = fromUnidic([
      row('ヤバく', '形容詞,一般,*,*,形容詞,連用形-一般,ヤバイ,やばい,ヤバく,ヤバク,ヤバい,ヤバイ,和,*,*,*,*'),
      row('ない', '形容詞,非自立可能,*,*,形容詞,終止形-一般,ナイ,無い,ない,ナイ,ない,ナイ,和,*,*,*,*'),
    ]);
    expect([words[1]?.pos, words[1]?.lemma]).toEqual(['助動詞', 'ない']);
    const [, sou] = fromUnidic([
      row('楽し', '形容詞,一般,*,*,形容詞,語幹-一般,タノシイ,楽しい,楽し,タノシ,楽しい,タノシー,和,*,*,*,*'),
      row('そう', '形状詞,助動詞語幹,*,*,*,*,ソウ,そう-様態,そう,ソー,そう,ソー,和,*,*,*,*'),
    ]);
    expect([sou?.pos, sou?.pos1, sou?.lemma, sou?.reading]).toEqual(['名詞', '接尾', 'そう', 'ソウ']);
  });
});

describe('a reading in kana from a pronunciation', () => {
  it('fills a long vowel from the lemma where it is a vowel there, and lengthens it otherwise', () => {
    expect(kanaReading('トーキョー', 'トウキョウ')).toBe('トウキョウ');
    expect(kanaReading('オーキク', 'オオキイ')).toBe('オオキク');
    expect(kanaReading('キー', 'キク')).toBe('キイ');
    expect(kanaReading('タベ', 'タベル')).toBe('タベ');
  });
});
