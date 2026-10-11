import { hasRomanizable, looseRoman, romanize } from '../morphology/romanize';

/**
 * How every search in the transcript panel compares text: the lines, the saved
 * lines, the word lists. The same whatever its width or case, and — where the
 * text has kana or Hangul and what was typed is Latin letters — by how it is
 * read: "demo" finds でも, "hangeul" finds 한글. Kanji has no spelling of its
 * own, so text is compared a second way where its reading is known (a word's
 * in the lists, a line's once it has been analysed): "tabemasu" finds 食べます.
 * What was typed may mix the two, 食べmas: kana and Hangul are spelt out on
 * both sides and whatever else is there has to match as written.
 */

/** Text as a search compares it: the same whatever its width or case. */
export function foldText(t: string): string {
  return t.normalize('NFKC').toLocaleLowerCase();
}

const spelt = new Map<string, string>();

/** Text with its kana and Hangul spelt out, loosely; kanji and the rest as written. */
function spelling(text: string): string {
  let s = spelt.get(text);
  if (s === undefined) {
    if (spelt.size > 20000) spelt.clear();
    s = looseRoman(romanize(foldText(text)));
    spelt.set(text, s);
  }
  return s;
}

/**
 * A search for `query`, compared against any number of texts. Built once per
 * query. `reading` is how the text is read, where that is known.
 */
export function matcher(query: string): (text: string, reading?: string) => boolean {
  const q = foldText(query.trim());
  if (!q) return () => false;
  const typed = looseRoman(romanize(q));
  return (text, reading) => {
    if (!text) return false;
    if (foldText(text).includes(q)) return true;
    if (!typed) return false;
    if (hasRomanizable(text) && spelling(text).includes(typed)) return true;
    return Boolean(reading) && spelling(reading as string).includes(typed);
  };
}
