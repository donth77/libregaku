import { describe, expect, it } from 'vitest';
import { jpodQuery } from '../pronounce';

const parse = (q: string) => Object.fromEntries(new URLSearchParams(q));

describe('jpodQuery', () => {
  it('converts a katakana reading to hiragana', () => {
    // Lindera returns katakana; the service only answers to hiragana, so this
    // was silently missing for every kanji word.
    expect(parse(jpodQuery('食べる', 'タベル'))).toEqual({ kanji: '食べる', kana: 'たべる' });
  });

  it('leaves a hiragana reading alone', () => {
    expect(parse(jpodQuery('勉強', 'べんきょう')).kana).toBe('べんきょう');
  });

  it('always sends kana, falling back to the word itself', () => {
    // kanji=やばい alone misses; kanji=やばい&kana=やばい returns audio.
    expect(parse(jpodQuery('やばい'))).toEqual({ kanji: 'やばい', kana: 'やばい' });
  });

  it('normalises a kana-only word given as katakana', () => {
    expect(parse(jpodQuery('ヤバイ')).kana).toBe('やばい');
  });
});
