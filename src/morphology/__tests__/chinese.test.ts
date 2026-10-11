import { describe, expect, it } from 'vitest';
import { zhRuby, zhTokens } from '../chinese';

/**
 * Chinese words as tokens, and pinyin over their characters. The words and
 * readings are as the offscreen document reports them: surfaces from the
 * analyser, readings from CC-CEDICT.
 */

describe('zhTokens', () => {
  const line = '我们今天去学校，OK吗？';
  const words = [
    { surface: '我们', reading: 'wǒ men' }, { surface: '今天', reading: 'jīn tiān' },
    { surface: '去', reading: 'qù' }, { surface: '学校', reading: 'xué xiào' }, { surface: '，' },
    { surface: 'OK' }, { surface: '吗', reading: 'ma' }, { surface: '？' },
  ];

  it('looks each word up as it is written, by its reading', () => {
    const tokens = zhTokens(line, words);
    const school = tokens.find((t) => t.surface === '学校');
    expect(school).toMatchObject({
      lemma: '学校', reading: 'xué xiào', content: true, start: 5, end: 7,
      lookup: [{ key: '学校', reading: 'xué xiào' }],
    });
    // Chinese does not inflect: nothing to trace back to a dictionary form.
    expect(school?.parts).toBeUndefined();
  });

  it('counts only words written in Chinese characters as words to learn', () => {
    const tokens = zhTokens(line, words);
    expect(tokens.filter((t) => t.content).map((t) => t.surface)).toEqual(['我们', '今天', '去', '学校', '吗']);
    expect(tokens.find((t) => t.surface === 'OK')).toMatchObject({ content: false, punct: false });
    expect(tokens.find((t) => t.surface === '，')?.punct).toBe(true);
  });

  it('keeps the spaces a subtitle uses for commas', () => {
    const tokens = zhTokens('你好 再见', [{ surface: '你好', reading: 'nǐ hǎo' }, { surface: '再见', reading: 'zài jiàn' }]);
    expect(tokens.map((t) => t.surface)).toEqual(['你好', ' ', '再见']);
    expect(tokens[1]).toMatchObject({ punct: true, start: 2, end: 3 });
  });

  it('draws every character of the line, whatever the analyser left out', () => {
    const text = '好的 走吧';
    const tokens = zhTokens(text, [{ surface: '好的' }, { surface: '走' }, { surface: '吧' }]);
    expect(tokens.map((t) => t.surface).join('')).toBe(text);
  });
});

describe('zhRuby', () => {
  it('puts one syllable over each character', () => {
    expect(zhRuby('学校', 'xué xiào')).toEqual([{ text: '学', ruby: 'xué' }, { text: '校', ruby: 'xiào' }]);
    expect(zhRuby('了', 'le')).toEqual([{ text: '了', ruby: 'le' }]);
  });

  it('gives the r of erhua to its own character', () => {
    expect(zhRuby('一点儿', 'yī diǎn r')).toEqual([
      { text: '一', ruby: 'yī' }, { text: '点', ruby: 'diǎn' }, { text: '儿', ruby: 'r' },
    ]);
  });

  it('leaves letters inside a word without a reading of their own', () => {
    // CC-CEDICT reads the letter as itself: A A zhì.
    expect(zhRuby('AA制', 'A A zhì')).toEqual([{ text: 'AA' }, { text: '制', ruby: 'zhì' }]);
    // A phrase's reading names only its characters.
    expect(zhRuby('卡拉OK', 'kǎ lā')).toEqual([{ text: '卡', ruby: 'kǎ' }, { text: '拉', ruby: 'lā' }, { text: 'OK' }]);
  });

  it('puts a reading it cannot divide over the whole word', () => {
    expect(zhRuby('学校', 'xuéxiào')).toEqual([{ text: '学校', ruby: 'xuéxiào' }]);
  });

  it('draws nothing over a word with no reading, or no characters', () => {
    expect(zhRuby('学校')).toEqual([{ text: '学校' }]);
    expect(zhRuby('OK', 'ou kei')).toEqual([{ text: 'OK' }]);
  });
});
