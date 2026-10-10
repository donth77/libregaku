import { describe, expect, it } from 'vitest';
import { forLanguage, kanjiIn, toKanji } from '../kanji';

/** 勉 as jmdict-simplified publishes it, trimmed to what is read. */
const BEN = {
  literal: '勉',
  misc: { grade: 3, strokeCounts: [10], frequency: 1066, jlptLevel: 3 },
  readingMeaning: {
    groups: [{
      readings: [
        { type: 'pinyin', value: 'mian3' },
        { type: 'ja_on', value: 'ベン' },
        { type: 'ja_kun', value: 'つと.める' },
      ],
      meanings: [
        { lang: 'en', value: 'exertion' }, { lang: 'en', value: 'endeavour' },
        { lang: 'fr', value: 'exercice' }, { lang: 'es', value: 'esforzarse' },
      ],
    }],
    nanori: ['ひこ'],
  },
};

describe('KANJIDIC2 records', () => {
  it('keeps the Japanese readings and every language of meanings', () => {
    expect(toKanji(BEN)).toEqual({
      char: '勉',
      meanings: { en: ['exertion', 'endeavour'], fr: ['exercice'], es: ['esforzarse'] },
      on: ['ベン'],
      kun: ['つと.める'],
      strokes: 10,
    });
  });

  it('takes a character with no readings or meanings as it is, and refuses one with no character', () => {
    expect(toKanji({ literal: '丂', misc: { strokeCounts: [2] }, readingMeaning: null }))
      .toEqual({ char: '丂', meanings: {}, on: [], kun: [], strokes: 2 });
    expect(toKanji({ misc: {} })).toBeNull();
    expect(toKanji(null)).toBeNull();
  });

  it("gives meanings in the learner's language where KANJIDIC2 has it, English otherwise", () => {
    const k = toKanji(BEN)!;
    expect(forLanguage(k, 'fr').meanings).toEqual(['exercice']);
    expect(forLanguage(k, 'de').meanings).toEqual(['exertion', 'endeavour']);
    expect(forLanguage({ ...k, meanings: { en: ['exertion'], es: [] } }, 'es').meanings).toEqual(['exertion']);
  });
});

describe('kanjiIn', () => {
  it('finds each kanji once, in order, and nothing else', () => {
    expect(kanjiIn('勉強する')).toEqual(['勉', '強']);
    expect(kanjiIn('人々')).toEqual(['人']);
    expect(kanjiIn('強い強さ')).toEqual(['強']);
    expect(kanjiIn('ひらがなとカタカナ')).toEqual([]);
  });
});
