import { describe, expect, it } from 'vitest';
import { looseRoman, romanize } from '../romanize';

describe('romanizing kana', () => {
  it('writes Hepburn', () => {
    expect(romanize('でも')).toBe('demo');
    expect(romanize('たべる')).toBe('taberu');
    expect(romanize('しんぶん')).toBe('shinbun');
    expect(romanize('ちゃいろ')).toBe('chairo');
    expect(romanize('じゅぎょう')).toBe('jugyou');
  });

  it('reads katakana the same, with its long vowels and loanword sounds', () => {
    expect(romanize('デモ')).toBe('demo');
    expect(romanize('コーヒー')).toBe('koohii');
    expect(romanize('ファイル')).toBe('fairu');
    expect(romanize('ティーム')).toBe('tiimu');
  });

  it('doubles the consonant after っ, and keeps what is not kana', () => {
    expect(romanize('まって')).toBe('matte');
    expect(romanize('いっち')).toBe('itchi');
    expect(romanize('東京で ok')).toBe('東京de ok');
  });
});

describe('romanizing Hangul', () => {
  it('spells each syllable by its letters', () => {
    expect(romanize('한글')).toBe('hangeul');
    expect(romanize('사랑')).toBe('sarang');
    expect(romanize('학교')).toBe('hakgyo');
    expect(romanize('안녕하세요')).toBe('annyeonghaseyo');
  });
});

describe('the spellings people type', () => {
  it('fold together', () => {
    const same = (a: string, b: string): void => expect(looseRoman(a)).toBe(looseRoman(b));
    same('shi', 'si');
    same('tsu', 'tu');
    same('fu', 'hu');
    same('ji', 'zi');
    same('sha', 'sya');
    same('toukyou', 'tokyo');
    same('tōkyō', 'tokyo');
    same('matcha', 'mattya');
  });
});
