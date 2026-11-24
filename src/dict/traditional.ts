import { TRADITIONAL } from './zh-traditional';

/**
 * Chinese text in traditional characters, for a learner who reads them (zh-Hant).
 *
 * Chinese Wiktionary's files, and the Korean dictionary's Chinese, are written mostly in simplified characters:
 * Spanish visto is 看见，查看，拜访 there, which a reader in Taiwan or Hong Kong reads as 看見，查看，拜訪. Each
 * character that is one traditional character wherever it stands is written as that one (zh-traditional.ts, from
 * CC-CEDICT and Unihan). A character that is two — 发 is 發 in 发现 and 髮 in 头发 — is left as it is written: only
 * a word list says which, and a character the reader can still read beats one that is wrong.
 *
 * Over the 329,000 meanings with Chinese characters in the eight files in Chinese the extension reads (2026.10.22),
 * 150,000 change. 24,000 keep a character whose traditional form is usually another, most often 发, 于, 后, 复 or 干
 * (scripts/build-zh-traditional.mjs says how the table is made). A word list for those, CC-CEDICT's 7,700 words
 * with one of them, would put two in three of those meanings right, and is 280 KB as the build writes it.
 *
 * Kanji written with hiragana are a Japanese word's, and keep Japan's forms: a meaning of a Japanese word may quote
 * one (「会う」的敬语), and 会 is no Chinese character there to change. Katakana says nothing of the characters
 * beside it, which are as often the Chinese that explains it (テレビ的缩写). A Japanese word quoted without kana,
 * 社会 (shakai), cannot be told from Chinese, and is written as Chinese is.
 */
export function toTraditional(text: string): string {
  return text.replace(HAN, (run, at: number) => {
    const before = text[at - 1] ?? '';
    const after = text[at + run.length] ?? '';
    if (HIRAGANA.test(before) || HIRAGANA.test(after)) return run;
    let out = '';
    for (const char of run) out += TRADITIONAL.get(char) ?? char;
    return out;
  });
}

const HAN = /\p{Script=Han}+/gu;
const HIRAGANA = /\p{Script=Hiragana}/u;
