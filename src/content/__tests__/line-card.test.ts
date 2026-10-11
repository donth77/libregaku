import { describe, expect, it } from 'vitest';
import type { Token } from '../../morphology/types';
import { furigana } from '../../morphology/furigana';
import { zhRuby } from '../../morphology/chinese';
import { lineReading } from '../line-card';
import { toAnkiFurigana } from '../../anki/model';

/** Readings the way Japanese draws them: kana over the kanji they read. */
const kana = (t: Token) => furigana(t.surface, t.reading);

const tok = (surface: string, reading?: string, more: Partial<Token> = {}): Token =>
  ({ surface, start: 0, end: surface.length, content: true, ...(reading ? { reading } : {}), ...more });

describe('lineReading', () => {
  const line = [tok('外国', 'ガイコク'), tok('に', 'ニ'), tok('行き', 'イキ'), tok('たい', 'タイ'), tok('。', undefined, { punct: true })];

  it('puts a reading over the words that showed one, and leaves the rest as written', () => {
    const shows = (t: Token): boolean => t.surface === '外国';
    expect(toAnkiFurigana(lineReading(line, shows, kana))).toBe('外国[がいこく]に行きたい。');
  });

  it('reads as the line did when every word showed its reading', () => {
    expect(toAnkiFurigana(lineReading(line, () => true, kana))).toBe('外国[がいこく]に 行[い]きたい。');
  });

  it('is the line as written when none did', () => {
    expect(toAnkiFurigana(lineReading(line, () => false, kana))).toBe('外国に行きたい。');
  });

  it('keeps a line break between cues shown together', () => {
    const two = [tok('はい', 'ハイ'), tok('\n', undefined, { punct: true }), tok('外国', 'ガイコク')];
    expect(toAnkiFurigana(lineReading(two, () => true, kana))).toBe('はい\n 外国[がいこく]');
  });

  it('draws readings the way the language being learned does', () => {
    const zh = [tok('我们', 'wǒ men'), tok('去', 'qù'), tok('学校', 'xué xiào')];
    const pinyin = (t: Token) => zhRuby(t.surface, t.reading);
    expect(toAnkiFurigana(lineReading(zh, (t) => t.surface === '学校', pinyin))).toBe('我们去 学[xué] 校[xiào]');
  });
});
