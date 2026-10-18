import { describe, expect, it } from 'vitest';
import type { FirstReading } from '../extra-words';
import { readJapanese, withFirstReadings, type Row } from '../japanese';
import type { Morpheme } from '../merge';

/** IPADIC's rows for a line: surface, then its nine columns. */
const row = (surface: string, details: string): Row => ({ surface, details: details.split(',') });

describe('the dictionary\'s first reading, for a word IPADIC reads by a later one', () => {
  const list = new Map<string, FirstReading>([
    ['日本', { surface: '日本', from: 'ニッポン', to: 'ニホン', name: true }],
    ['山下', { surface: '山下', from: 'ヤマシタ', to: 'サンカ' }],
    ['汚す', { surface: '汚す', from: 'ケガス', to: 'ヨゴス' }],
    ['版', { surface: '版', from: 'バン', to: 'ハン' }],
  ]);
  const word = (surface: string, reading: string, more: Partial<Morpheme> = {}): Morpheme =>
    ({ surface, lemma: surface, reading, pos: '名詞', pos1: '一般', ...more });

  it('replaces the reading, and drops what UniDic had to say of the word', () => {
    const japan = word('日本', 'ニッポン', { pos1: '固有名詞', second: { reading: 'ニッポン' } });
    expect(withFirstReadings([japan], list)).toEqual([word('日本', 'ニホン', { pos1: '固有名詞' })]);
    // Read another way already: left, and the same word as it was.
    const other = word('日本', 'ニホン');
    expect(withFirstReadings([other], list)[0]).toBe(other);
  });

  it('leaves a name the line makes of a word, an ending, and a form that is not the dictionary\'s', () => {
    const name = word('山下', 'ヤマシタ', { pos1: '固有名詞' });
    const plain = word('山下', 'ヤマシタ');
    expect(withFirstReadings([name, plain], list).map((m) => m.reading)).toEqual(['ヤマシタ', 'サンカ']);
    expect(withFirstReadings([word('版', 'バン', { pos1: '接尾' })], list)[0]?.reading).toBe('バン');
    const stem: Morpheme = { surface: '汚す', lemma: '汚せる', reading: 'ケガス', pos: '動詞', pos1: '自立' };
    expect(withFirstReadings([stem], list)[0]?.reading).toBe('ケガス');
    expect(withFirstReadings([{ surface: '汚す', lemma: '汚す', reading: 'ケガス', pos: '動詞', pos1: '自立' }], list)[0]?.reading).toBe('ヨゴス');
  });

  it('is applied to a line as it is read, where the list is there', () => {
    const ipadic = (): Row[] => [row('日本', '名詞,固有名詞,地域,国,*,*,日本,ニッポン,ニッポン'), row('へ', '助詞,格助詞,一般,*,*,*,へ,ヘ,エ')];
    expect(readJapanese('日本へ', { ipadic }).map((m) => m.reading)).toEqual(['ニッポン', 'ヘ']);
    expect(readJapanese('日本へ', { ipadic, firstReadings: list }).map((m) => m.reading)).toEqual(['ニホン', 'ヘ']);
  });
});
