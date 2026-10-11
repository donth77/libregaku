/**
 * Pinyin, as CC-CEDICT writes it and as a learner reads it.
 *
 * The file numbers its tones and spells ü as u: — xue2 xiao4, lu:4. Whatever
 * is shown carries tone marks instead: xué xiào, lǜ.
 */

/** The combining mark for each tone, first to fourth: macron, acute, caron, grave. */
const MARK = ['\u0304', '\u0301', '\u030C', '\u0300'];

/**
 * A syllable and its tone number: letters, of which only the first may be a
 * capital, then 1 to 5. Found wherever one sits, because the file writes two
 * in one piece for a character read as two — 兙 is shi2ke4 — and some notes
 * write a word's syllables together: [shang4zai4].
 */
const NUMBERED = /([A-Za-zÜü][a-zü:]*)([1-5])/g;

/** Syllables with no vowel to carry the mark, which goes on the m or the n: 呣 m2, 嗯 ng4, 哼 hng5. */
const NASAL = /^h?(?:m|ng?)$/;

/**
 * One syllable with its mark, or null for letters that are no syllable: the
 * xx5 the file writes where a headword has no reading, a letter and a digit.
 *
 * The mark goes on a, else on e, else on the o of ou, else on the last vowel:
 * hǎo, xué, gǒu, guì, liú.
 */
function marked(letters: string, tone: number): string | null {
  const s = letters.replace(/u:|v/g, 'ü').replace(/U:/g, 'Ü');
  const low = s.toLowerCase();

  let at: number;
  if (NASAL.test(low)) at = low.search(/[mn]/);
  else if (low === 'r') return tone === 5 ? s : null;   // 兒 after its word: 一下兒 yi1 xia4 r5
  else {
    at = low.indexOf('a');
    if (at < 0) at = low.indexOf('e');
    if (at < 0) at = low.indexOf('ou');
    if (at < 0) at = low.search(/[iouü][^iouü]*$/);
    if (at < 0) return null;
  }

  const mark = MARK[tone - 1];
  if (!mark) return s;   // the fifth tone is the neutral one, written bare
  // Composed: ǚ as the one character fonts have, not a u with two marks set over it.
  return (s.slice(0, at + 1) + mark + s.slice(at + 1)).normalize('NFC');
}

/**
 * CC-CEDICT's numbered pinyin with tone marks: 'xue2 xiao4' → 'xué xiào'.
 *
 * Syllables stay as far apart as they were — one space, in the file — because
 * the overlay puts one over each character by splitting on it. Whatever is
 * not a numbered syllable is left as it is: the letters of AA制 [AA zhi4], the
 * digits of 11區 [11 Qu1], the dot of 亞當·斯密 [Ya4 dang1 · Si1 mi4], a comma.
 */
export function toneMarks(numbered: string): string {
  return numbered.replace(NUMBERED, (whole, letters: string, tone: string) => marked(letters, Number(tone)) ?? whole);
}

/**
 * One spelling for comparing readings: lower case, no spaces, tone marks kept.
 *
 * Numbered pinyin is given its marks first, so a reading compares equal
 * however its tones were written. Tones are never dropped: 东西 dōng xi is a
 * thing, dōng xī is east and west.
 */
export function foldPinyin(reading: string): string {
  return toneMarks(reading).normalize('NFC').toLowerCase().replace(/\s+/g, '');
}
