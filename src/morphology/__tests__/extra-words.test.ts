import { describe, expect, it } from 'vitest';
import type { Entry } from '../../dict/jmdict';
import {
  EXTRA_COST, extraCandidates, extraRows, firstReadingCollector, firstReadingOf, firstReadingRows, firstReadingTable,
  firstReadingsBy, firstReadingsKept, misreads, type AnalysedPiece,
} from '../extra-words';

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

describe('a word IPADIC reads by a reading the dictionary lists second', () => {
  /** An entry with its readings in the dictionary's order. */
  const word = (spelling: string, readings: string[], over: Partial<Entry> = {}): Entry => ({
    id: `${spelling}-${readings[0]}`, word: spelling, reading: readings[0], common: true, senses: [{ pos: ['n'], glosses: ['…'] }],
    forms: [{ text: spelling, kana: false, common: true }, ...readings.map((text) => ({ text, kana: true, common: true }))],
    ...over,
  });
  const candidates = (...entries: Entry[]) => {
    const c = firstReadingCollector();
    for (const e of entries) c.add(e);
    return c.candidates();
  };
  /** What IPADIC makes of a word alone. */
  const whole = (surface: string, reading: string, more: Partial<AnalysedPiece> = {}): AnalysedPiece[] =>
    [{ surface, reading, lemma: surface, pos: '名詞', pos1: '一般', ...more }];

  it('is offered with the first: 日本 is にほん, and にっぽん after it', () => {
    const found = candidates(word('日本', ['にほん', 'にっぽん']), word('食べる', ['たべる']));
    expect([...found.keys()]).toEqual(['日本']);
    expect([...found.get('日本')!]).toEqual([['ニッポン', 'ニホン']]);
  });

  it('is not offered where two words list it behind different firsts, or by a rare spelling', () => {
    expect(candidates(word('上下', ['じょうげ', 'うえした']), word('上下', ['しょうか', 'うえした'])).size).toBe(0);
    const rare = word('日本', ['にほん', 'にっぽん'], { forms: [{ text: '日本', kana: false, common: false, rare: true }, { text: 'にほん', kana: true, common: true }, { text: 'にっぽん', kana: true, common: true }] });
    expect(candidates(rare).size).toBe(0);
  });

  const later = new Map([['ニッポン', 'ニホン']]);

  it('is put right where IPADIC has the word whole and reads it so', () => {
    expect(firstReadingOf('日本', later, whole('日本', 'ニッポン', { pos1: '固有名詞', pos2: '地域' })))
      .toEqual({ surface: '日本', from: 'ニッポン', to: 'ニホン', name: true });
    expect(firstReadingOf('明後日', new Map([['ミョウゴニチ', 'アサッテ']]), whole('明後日', 'ミョウゴニチ')))
      .toEqual({ surface: '明後日', from: 'ミョウゴニチ', to: 'アサッテ' });
    // Read the first way already, cut in two, or as a form of another word.
    expect(firstReadingOf('日本', later, whole('日本', 'ニホン'))).toBeNull();
    expect(firstReadingOf('日本', later, [{ surface: '日', reading: 'ニチ' }, { surface: '本', reading: 'ホン' }])).toBeNull();
    expect(firstReadingOf('済み', new Map([['スミ', 'ズミ']]), whole('済み', 'スミ', { lemma: '済む', pos: '動詞' }))).toBeNull();
  });

  it('is left where it reads by where it stands: a number, an ending, a prefix', () => {
    expect(firstReadingOf('四', new Map([['ヨン', 'シ']]), whole('四', 'ヨン', { pos1: '数' }))).toBeNull();
    expect(firstReadingOf('版', new Map([['バン', 'ハン']]), whole('版', 'バン', { pos1: '接尾' }))).toBeNull();
    expect(firstReadingOf('御', new Map([['ゴ', 'オ']]), whole('御', 'ゴ', { pos: '接頭詞', pos1: '名詞接続' }))).toBeNull();
  });

  it('is left where it is a person\'s name, or a name read wholly otherwise', () => {
    expect(firstReadingOf('千尋', new Map([['チヒロ', 'センジン']]), whole('千尋', 'チヒロ', { pos1: '固有名詞', pos2: '人名' }))).toBeNull();
    expect(firstReadingOf('青山', new Map([['アオヤマ', 'セイザン']]), whole('青山', 'アオヤマ', { pos1: '固有名詞', pos2: '地域' }))).toBeNull();
    // The one name said two ways, a kana or two apart.
    expect(firstReadingOf('東日本', new Map([['ヒガシニッポン', 'ヒガシニホン']]), whole('東日本', 'ヒガシニッポン', { pos1: '固有名詞', pos2: '地域' })))
      .toMatchObject({ to: 'ヒガシニホン', name: true });
  });

  it('is left where the spelling has no kanji, or the reading changes its kana', () => {
    expect(firstReadingOf('ＣＤ', new Map([['シーディー', 'シー・ディー']]), whole('ＣＤ', 'シーディー'))).toBeNull();
    expect(firstReadingOf('ヒンズー教', new Map([['ヒンズーキョウ', 'ヒンドゥーキョウ']]), whole('ヒンズー教', 'ヒンズーキョウ'))).toBeNull();
    expect(firstReadingOf('この間', new Map([['コノカン', 'コノアイダ']]), whole('この間', 'コノカン'))).toMatchObject({ to: 'コノアイダ' });
  });

  it('is listed by the analyser, and dropped where the reading is another word\'s first', () => {
    const found = candidates(word('日本', ['にほん', 'にっぽん']), word('大事', ['おおごと', 'だいじ']));
    const read = firstReadingsBy(found, (surface) => whole(surface, surface === '日本' ? 'ニッポン' : 'ダイジ'));
    expect(read.map((r) => r.surface)).toEqual(['日本', '大事']);
    // 大事, だいじ, is a word of its own: the dictionary has it first under the same spelling.
    const words: Record<string, Array<{ reading: string }>> = { 日本: [{ reading: 'にほん' }], 大事: [{ reading: 'だいじ' }, { reading: 'おおごと' }] };
    expect(firstReadingsKept(read, (surface) => words[surface]).map((r) => r.surface)).toEqual(['日本']);
  });

  it('is kept as rows, a word a line, and read back', () => {
    const list = [{ surface: '日本', from: 'ニッポン', to: 'ニホン', name: true }, { surface: '白髪', from: 'ハクハツ', to: 'シラガ' }];
    const rows = firstReadingRows(list);
    expect(rows).toBe('日本\tニッポン\tニホン\tname\n白髪\tハクハツ\tシラガ');
    expect([...firstReadingTable(rows).values()]).toEqual(list);
    expect(firstReadingTable('').size).toBe(0);
  });
});
