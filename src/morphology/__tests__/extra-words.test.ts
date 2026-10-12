import { describe, expect, it } from 'vitest';
import type { Entry } from '../../dict/jmdict';
import { EXTRA_COST, extraCandidates, extraRows, misreads } from '../extra-words';

/**
 * The words handed to the analyser. What matters is what stays out: every
 * word added is one more way a line IPADIC reads well could read differently.
 */

const entry = (word: string, reading: string, pos: string[], over: Partial<Entry> = {}): Entry => ({
  id: `${word}-${reading}`,
  word,
  reading,
  common: false,
  senses: [{ pos, glosses: ['…'] }],
  forms: [{ text: word, kana: false, common: false }, { text: reading, kana: true, common: false }],
  ...over,
});

describe('the words JMdict offers the analyser', () => {
  it('are kanji nouns with one reading, in katakana as IPADIC writes them', () => {
    expect(extraCandidates([
      entry('盗撮', 'とうさつ', ['n', 'vs', 'vt']),
      entry('灯籠', 'とうろう', ['n']),
      entry('微妙', 'びみょう', ['adj-na', 'n']),
    ])).toEqual([
      { surface: '盗撮', reading: 'トウサツ', kind: 'suru' },
      { surface: '灯籠', reading: 'トウロウ', kind: 'general' },
      { surface: '微妙', reading: 'ビミョウ', kind: 'na' },
    ]);
  });

  it('leave out what is not a kanji noun of two to four characters', () => {
    expect(extraCandidates([
      entry('とうさつ', 'とうさつ', ['n']),          // kana
      entry('猫', 'ねこ', ['n']),                    // one character
      entry('国際連合総会', 'こくさいれんごうそうかい', ['n']),   // too long
      entry('一人', 'ひとり', ['n']),                // a number: merging reads those
      entry('食べる', 'たべる', ['v1']),              // not a noun
      entry('灯籠', 'とうろう', ['n-suf']),           // a suffix
    ])).toEqual([]);
  });

  it('leave out a spelling read two ways, and a rare one', () => {
    expect(extraCandidates([
      entry('上手', 'じょうず', ['n']),
      entry('上手', 'うわて', ['n']),
      entry('燈籠', 'とうろう', ['n'], { forms: [{ text: '燈籠', kana: false, common: false, rare: true }] }),
    ])).toEqual([]);
  });
});

describe('a word IPADIC misreads', () => {
  const w = (surface: string, reading: string) => ({ surface, reading, kind: 'general' as const });

  it('is split around a lone kanji, into pieces that read differently', () => {
    expect(misreads(w('盗撮', 'トウサツ'), [{ surface: '盗', reading: 'ト' }, { surface: '撮', reading: 'ト' }])).toBe(true);
    expect(misreads(w('金糸瓜', 'キンシウリ'), [{ surface: '金', reading: 'キム' }, { surface: '糸瓜', reading: 'ヘチマ' }])).toBe(true);
    expect(misreads(w('灯籠', 'トウロウ'), [{ surface: '灯' }, { surface: '籠', reading: 'カゴ' }])).toBe(true);
  });

  it('is not one it reads whole, or splits into words that read right', () => {
    expect(misreads(w('時間', 'ジカン'), [{ surface: '時間', reading: 'ジカン' }])).toBe(false);
    // Words a learner knows, read right: left as they are.
    expect(misreads(w('自由時間', 'ジユウジカン'), [{ surface: '自由', reading: 'ジユウ' }, { surface: '時間', reading: 'ジカン' }])).toBe(false);
    expect(misreads(w('広告会社', 'コウコクガイシャ'), [{ surface: '広告', reading: 'コウコク' }, { surface: '会社', reading: 'カイシャ' }])).toBe(false);
    expect(misreads(w('再利用', 'サイリヨウ'), [{ surface: '再', reading: 'サイ' }, { surface: '利用', reading: 'リヨウ' }])).toBe(false);
  });
});

describe('the rows Lindera reads', () => {
  it("are IPADIC's thirteen columns, scored weakly, with the analyser's columns where it reads them", () => {
    const row = extraRows([{ surface: '盗撮', reading: 'トウサツ', kind: 'suru' }]).split(',');
    expect(row).toEqual(['盗撮', '1283', '1283', String(EXTRA_COST), '名詞', 'サ変接続', '*', '*', '*', '*', '盗撮', 'トウサツ', 'トウサツ']);
    // What the offscreen document reads (its IPADIC layout): part of speech, detail, base form, reading.
    const details = row.slice(4);
    expect([details[0], details[1], details[6], details[7]]).toEqual(['名詞', 'サ変接続', '盗撮', 'トウサツ']);
  });
});

describe('adverbs of speech', () => {
  it('are rows of the same thirteen columns, as adverbs, each with its own score', async () => {
    const { SPOKEN_ADVERBS, analyserRows, spokenRows } = await import('../extra-words');
    const rows = spokenRows().split('\n').map((r) => r.split(','));
    expect(rows).toHaveLength(SPOKEN_ADVERBS.length);
    expect(rows.find((r) => r[0] === 'めちゃ')).toEqual(['めちゃ', '1281', '1281', '9000', '副詞', '一般', '*', '*', '*', '*', 'めちゃ', 'メチャ', 'メチャ']);
    expect(rows.find((r) => r[0] === 'たまに')?.[3]).toBe('4000');
    // They go to the analyser after JMdict's words, and alone when there are none.
    expect(analyserRows([])).toBe(spokenRows());
    expect(analyserRows([{ surface: '盗撮', reading: 'トウサツ', kind: 'suru' }]).split('\n')).toHaveLength(1 + SPOKEN_ADVERBS.length);
  });
});

