import { describe, expect, it } from 'vitest';
import { toTraditional } from '../traditional';
import { TRADITIONAL } from '../zh-traditional';

/** Chinese Wiktionary's meanings, for a learner who reads traditional characters (zh-Hant). */
describe('toTraditional', () => {
  it('writes each character that is one traditional character wherever it stands as that one', () => {
    // Spanish visto → ver, as wty-es-zh explains it.
    expect(toTraditional('vt. 看见，查看，拜访')).toBe('vt. 看見，查看，拜訪');
    expect(toTraditional('m.pr. 阿拉胡埃拉(哥斯达黎加)')).toBe('m.pr. 阿拉胡埃拉(哥斯達黎加)');
  });

  it('leaves a character whose traditional form depends on the word as it is written', () => {
    // 发 is 發 in 发现 and 髮 in 头发; 后 is 後 in 以后 and itself in 皇后; 于 is 於 and the surname 于.
    for (const char of ['发', '后', '于', '干', '台', '里', '面']) expect(TRADITIONAL.has(char), char).toBe(false);
    expect(toTraditional('(头路两边的)侧发')).toBe('(頭路兩邊的)側发');
  });

  it('leaves traditional text as it is, and anything that is not Chinese', () => {
    expect(toTraditional('看見，查看，拜訪')).toBe('看見，查看，拜訪');
    expect(toTraditional('to see; to look')).toBe('to see; to look');
    expect(toTraditional('')).toBe('');
  });

  it('keeps a Japanese word written with kana in Japan’s forms', () => {
    expect(toTraditional('「会う」的敬语')).toBe('「会う」的敬語');
    expect(toTraditional('テレビ的缩写')).toBe('テレビ的縮寫');
  });
});
