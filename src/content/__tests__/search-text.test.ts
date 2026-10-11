import { describe, expect, it } from 'vitest';
import { matcher } from '../search-text';

describe('searching text', () => {
  it('finds Japanese by how it is read: demo finds でも and デモ', () => {
    const has = matcher('demo');
    expect(has('でも')).toBe(true);
    expect(has('デモ')).toBe(true);
    expect(has('これはデモです')).toBe(true);
    expect(has('でした')).toBe(false);
  });

  it('takes the spellings people type', () => {
    expect(matcher('tabemasu')('食べます')).toBe(false);   // kanji has no spelling of its own
    expect(matcher('tabemasu')('たべます')).toBe(true);
    expect(matcher('si')('しごと')).toBe(true);
    expect(matcher('tokyo')('とうきょう')).toBe(true);
  });

  it('finds Hangul by its romanization', () => {
    expect(matcher('hangeul')('한글')).toBe(true);
    expect(matcher('hakgyo')('학교에 가요')).toBe(true);
  });

  it('still finds text as it is written, whatever its width or case', () => {
    expect(matcher('でも')('でも、いい')).toBe(true);
    expect(matcher('ＡＢＣ')('abc')).toBe(true);
    expect(matcher('Hello')('hello world')).toBe(true);
    expect(matcher('')('anything')).toBe(false);
    expect(matcher('xyz')('でも')).toBe(false);
  });

  it('does not spell text that has none to spell', () => {
    expect(matcher('ni')('nihao 你好')).toBe(true);   // as written
    expect(matcher('hao')('你好')).toBe(false);
  });

  it('finds kanji by its reading, where the reading is known', () => {
    expect(matcher('tabemasu')('食べます', 'タベマス')).toBe(true);
    expect(matcher('tousatsu')('盗撮された', 'トウサツサレタ')).toBe(true);
    expect(matcher('tosatu')('盗撮された', 'トウサツサレタ')).toBe(true);
    expect(matcher('たべ')('食べます', 'タベマス')).toBe(true);
    expect(matcher('nomimasu')('食べます', 'タベマス')).toBe(false);
  });

  it('takes kanji and romaji typed together: 食べmas', () => {
    expect(matcher('食べmas')('食べます')).toBe(true);
    expect(matcher('食bemas')('食べます')).toBe(true);
    expect(matcher('食べmas')('毎日食べますか', 'マイニチタベマスカ')).toBe(true);
    expect(matcher('飲べmas')('食べます', 'タベマス')).toBe(false);
  });
});
