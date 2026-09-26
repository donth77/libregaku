/**
 * Reading Anki fields back as text.
 *
 * Fields are HTML, may carry Anki's furigana syntax, and — since cards are
 * written escaped — entities. The status layer and the marks both need the
 * plain word out of them, so the unpicking lives here once.
 */

/** Fields carry HTML and furigana brackets; the key is the bare expression. */
export function strip(html: string): string {
  return decode(
    html
      .replace(/<[^>]*>/g, '')
      // 勉強[べんきょう] → 勉強, with the space Anki wants before a run dropped.
      .replace(/ ?([^ >[\]]+?)\[[^\]]*\]/g, '$1')
      // [sound:…] and anything else bracketed.
      .replace(/\[[^\]]*\]/g, ''),
  ).trim();
}

/** A field as its reading: 分[わ]かる → わかる. Null unless the result is kana. */
export function toKana(html: string): string | null {
  const text = decode(
    html
      .replace(/<[^>]*>/g, '')
      .replace(/\[sound:[^\]]*\]/g, '')
      .replace(/ ?([^ >[\]]+?)\[([^\]]*)\]/g, '$2')
      .replace(/\[[^\]]*\]/g, ''),
  ).replace(/\s+/g, '');
  return phonetic(text);
}

/*
 * The one script-specific piece of the status layer: which characters spell a
 * word by sound. Kana, with katakana folded onto hiragana so ワカル and わかる
 * are one reading. Every other script returns null here, and matching stays
 * by exact spelling, as it always was. If a second language ever needs
 * reading matching, this belongs behind the Segmenter seam instead.
 */
const KANA = '\\u3041-\\u3096\\u309D\\u309E\\u30A1-\\u30FA\\u30FC-\\u30FE';
const KANA_ONLY = new RegExp(`^[${KANA}]+$`);
const NOT_KANA = new RegExp(`[^${KANA}]+`);

/** The word in hiragana if it is written wholly in kana, else null. */
export function phonetic(s: string): string | null {
  if (!KANA_ONLY.test(s)) return null;
  return s.replace(/[ァ-ヶヽヾ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** Whether the word's own kana — かる in 分かる — appear in the reading, in order. */
export function fits(word: string, reading: string): boolean {
  let at = 0;
  for (const run of word.split(NOT_KANA)) {
    if (!run) continue;
    const kana = phonetic(run) ?? run;
    const i = reading.indexOf(kana, at);
    if (i < 0) return false;
    at = i + kana.length;
  }
  return true;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

/** Entities back to text, after brackets are handled: &#91; is text, never furigana. */
export function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const hex = code[1] === 'x' || code[1] === 'X';
      const n = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}
