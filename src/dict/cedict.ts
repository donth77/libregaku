import type { Entry } from './jmdict';
import { foldPinyin, toneMarks } from './pinyin';
import { DEFAULT_READINGS } from './zh-readings';

/**
 * CC-CEDICT, as MDBG publishes it: one text file, an entry to a line.
 *
 *   學校 学校 [xue2 xiao4] /school/CL:所[suo3]/
 *
 * The word in traditional then simplified characters, one reading, and its
 * meanings between slashes. A word read two ways is two entries, so a lookup
 * finds several under one written form and something has to choose between
 * them — rank(), below. The file has no word frequencies and no parts of
 * speech to choose by.
 *
 * Nothing here downloads or stores. The store hands lines over and keeps what
 * comes back.
 */

export interface CedictRow {
  traditional: string;
  simplified: string;
  /** As the file writes it: 'xue2 xiao4'. */
  pinyin: string;
  glosses: string[];
}

const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.+)\/\s*$/;

/**
 * One line of the file: 學校 学校 [xue2 xiao4] /school/CL:所[suo3]/ — null for
 * comments and anything else.
 *
 * Lines end \r\n, and the last one with neither, so a line is taken with its
 * ending or without.
 */
export function parseLine(line: string): CedictRow | null {
  if (line.startsWith('#')) return null;
  const [, traditional, simplified, pinyin, body] = LINE.exec(line) ?? [];
  if (!traditional || !simplified || pinyin === undefined || !body) return null;
  const glosses = body.split('/').map((g) => g.trim()).filter(Boolean);
  return glosses.length ? { traditional, simplified, pinyin, glosses } : null;
}

/** What the file writes for a headword with no reading of its own: 々 [xx5]. */
const NO_READING = /^xx5(?: xx5)*$/;

/** Pinyin in a gloss, with the character before it and, in a list, the comma after. */
const BRACKETED = /(\S?)\[([^\]]*)\](,(?=\S))?/g;

/**
 * A gloss as it is stored: the file's words, made to read on a card.
 *
 * Besides meanings, glosses hold notes that name other words — CL:個|个[ge4],
 * see 東西|东西[dong1 xi5], variant of 說|说[shuo1], Taiwan pr. [le4 se4] — each
 * word in both scripts, traditional first, with numbered pinyin pressed
 * against it. So:
 *
 *   - the pinyin gets its tone marks, as every other reading shown has, and
 *     keeps its square brackets: one of these in ten already sits inside
 *     parentheses, and brackets are how the dictionary writes a reading
 *     wherever it is seen;
 *   - a space goes between a word and its pinyin, and after each comma of a
 *     list of them;
 *   - CL: is written out, "classifier:", the word the file's own glosses use
 *     (280 of them, against 6 that say "measure word");
 *   - both scripts stay, 個|个, because which to show is not known until the
 *     word is looked up. rank() keeps the one in the script asked for, and a
 *     card reads "classifier: 个 [gè]" or "classifier: 個 [gè]".
 *
 * A note stays where the file put it, among the meanings: for 蝴, "used in
 * 蝴蝶 [hú dié]" is all the dictionary has to say.
 */
function readable(gloss: string): string {
  return gloss.replace(/\bCL:/g, 'classifier: ').replace(BRACKETED, (whole, before: string, inner: string, comma?: string) => {
    // Thirty-seven notes write ü's colon with spaces round it, [Lu : 3 liang2
    // Shi4], and three write xx5 for a syllable left open: 就…[jiu4 xx5].
    const pinyin = toneMarks(inner.replace(/u : /gi, 'u:').replace(/\bxx5\b/g, '…'));
    // Not numbered pinyin — a Taiwanese reading, the [ ] of "square brackets" — and left alone.
    if (pinyin === inner) return whole;
    const gap = /[\p{L}\p{N}…]/u.test(before) ? ' ' : '';
    return `${before}${gap}[${pinyin}]${comma ? ', ' : ''}`;
  });
}

/**
 * The meanings one gloss holds, split at its semicolons — those outside
 * brackets of either kind, where a semicolon is part of a remark.
 *
 * The file once put a slash between any two meanings, /region/regional/local/.
 * Entries revised since keep the slash for a new sense and write the words of
 * one sense with semicolons, /to tell; to inform; to let know/ — one entry in
 * ten, but four in ten of the words in a line, the common ones having been
 * revised first. Taken apart, both kinds read the same wherever a sense is
 * shown, a card can keep to the first few, and "more meanings" counts one
 * thing in both.
 */
function meaningsIn(gloss: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < gloss.length; i++) {
    const c = gloss[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (c === ';' && !depth && gloss[i + 1] === ' ') {
      out.push(gloss.slice(from, i));
      from = i + 2;
    }
  }
  out.push(gloss.slice(from));
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Stored under its simplified form, with the traditional one beside it
 * (`alt`) when they differ.
 *
 * A sense for each of the file's glosses, holding the meanings it gives. The
 * file marks no word as common, and four headwords have no reading (々, 働),
 * which it writes xx5; those go without one.
 */
export function toEntry(row: CedictRow, id: string): Entry {
  return {
    id,
    word: row.simplified,
    ...(row.traditional !== row.simplified ? { alt: row.traditional } : {}),
    ...(NO_READING.test(row.pinyin) ? {} : { reading: toneMarks(row.pinyin) }),
    common: false,
    senses: row.glosses
      .map((g) => ({ pos: [], glosses: meaningsIn(readable(g)) }))
      .filter((s) => s.glosses.length),
  };
}

/** Both written forms, to index the entry under. */
export function keysFor(row: CedictRow): string[] {
  return row.traditional === row.simplified ? [row.simplified] : [row.simplified, row.traditional];
}

/** What is known about the text being looked up. */
export interface CedictHint {
  /** The reading it was given, in pinyin, marked or numbered. */
  reading?: string;
  /**
   * It is in traditional characters. Asked only of a word both scripts write
   * the same — 人, 的 — which cannot say for itself which script the words in
   * its glosses should be in: one lookup in ten.
   */
  traditional?: boolean;
}

/** A word in both scripts inside a gloss, traditional first: 東西|东西. */
const PAIR = /([^\s|[\](),;:"'/]+)\|([^\s|[\](),;:"'/]+)/g;

/**
 * The entry as it reads under `key`: headed by its traditional form when that
 * is what was looked up, and with the words its glosses name in that script
 * too. A word both scripts write the same reads in simplified, as stored,
 * unless told. A copy wherever anything differs; what is stored is not
 * touched.
 */
function written(entry: Entry, key: string, hint: CedictHint): Entry {
  const reached = entry.alt !== undefined && entry.alt === key && entry.word !== key;
  const traditional = entry.alt === undefined ? hint.traditional === true : reached;
  const paired = entry.senses.some((s) => s.glosses.some((g) => g.includes('|')));
  if (!reached && !paired) return entry;

  const pick = traditional ? '$1' : '$2';
  const senses = paired
    ? entry.senses.map((s) => ({ ...s, glosses: s.glosses.map((g) => g.replace(PAIR, pick)) }))
    : entry.senses;
  return reached ? { ...entry, word: key, alt: entry.word, senses } : { ...entry, senses };
}

/**
 * A gloss that sends the reader to another entry and gives no meaning of its
 * own: "see 東西", "variant of 說", "old variant of 為", "used in 蝴蝶", "abbr.
 * for 北京大學", after any label such as (dialect).
 */
const POINTER = /^(?:\([^)]*\) )*(?:see(?: also)? |(?:[\w-]+ ){0,2}variant of |used in |abbr\. (?:for|of) |same as |erhua form of )/;

/** The word a gloss calls this one a variant of, as simplified writes it: 年 in "variant of 年 [nián]". */
const VARIANT_OF = /^(?:\([^)]*\) )*(?:[\w-]+ ){0,2}variant of (?:[^\s|]+\|)?([^\s[]+)/;

/** How many of an entry's glosses say something of the word itself. */
function meanings(entry: Entry): number {
  let n = 0;
  for (const s of entry.senses) for (const g of s.glosses) if (!POINTER.test(g)) n++;
  return n;
}

/**
 * Another way of writing the word looked up, not a word of its own: an entry
 * whose traditional form is an unusual one, and which says so. 秊 年 is "grain;
 * harvest (old); variant of 年", and found under 年 it must not come before
 * "year" for having one meaning more.
 */
function isVariant(entry: Entry): boolean {
  if (entry.alt === undefined) return false;
  return entry.senses.some((s) => s.glosses.some((g) => VARIANT_OF.exec(g)?.[1] === entry.word));
}

/**
 * A proper name: CC-CEDICT gives the pinyin of surnames, places and the like
 * a capital. The letters in A片 [A pian4] are capitals too, and name nothing.
 */
function isName(entry: Entry): boolean {
  return (entry.reading ?? '').split(' ').some((s) => /^\p{Lu}/u.test(s) && !/^[A-Z]+$/.test(s));
}

/**
 * Words of more than one character whose two readings the file gives no way
 * to choose between — as many meanings each, neither a name nor a pointer —
 * and whose first in the file is the rarer. Counted over 44,590 Tatoeba
 * sentences, these four are the ones met often enough to matter; a neutral
 * last syllable is no rule for the rest (it would make 女人 "wife" and 老公
 * "eunuch"). A word joins this by that count.
 */
const USUAL_WORDS: Record<string, string> = {
  多少: 'duo1 shao5',    // "how much?", 198 times; duō shǎo is "amount"
  妻子: 'qi1 zi5',       // "wife", 65; qī zǐ is "wife and children"
  教授: 'jiao4 shou4',   // "professor", 24; jiāo shòu is "to teach"
  生意: 'sheng1 yi5',    // "business", 18; shēng yì is "vitality"
};

/** The usual reading of a word that has several: a character's from zh-readings.ts, one of the few words' above. */
function usualReading(key: string): string | undefined {
  if (Object.hasOwn(USUAL_WORDS, key)) return foldPinyin(USUAL_WORDS[key] ?? '');
  return Object.hasOwn(DEFAULT_READINGS, key) ? DEFAULT_READINGS[key] : undefined;
}

/**
 * Entries found under one written form, most likely first, each written in
 * the script asked for: one reached by its traditional form comes back headed
 * by it, with the simplified form as `alt`.
 *
 * CC-CEDICT has no frequency data, so this orders by what there is, in turn:
 *
 *  1. The reading asked for (hint.reading): 还 read huán is "to return", not
 *     "still".
 *  2. For a single character with several readings, its usual one
 *     (zh-readings.ts): 了 le, 的 de, 还 hái. One word in five of a line is
 *     such a character, and the steps below alone read more than one in four
 *     of those another way — 了 liǎo, 吗 má, 没 mò, 地 dì, 着 zháo, 为 wéi.
 *  3. An everyday word before a proper name: 中 "middle" before 中 "China",
 *     东方 "east" before the surname Dongfang.
 *  4. An entry that says what the word means before one that only points
 *     elsewhere: 说 "to speak" before 説 说, "variant of 說".
 *  5. The word itself before another way of writing it: 年 "year" before 秊
 *     年, "grain; harvest (old); variant of 年".
 *  6. More meanings: a word with many uses is the more general one. 告诉 gào
 *     su, "to tell; to inform; to let know", before gào sù, "to press
 *     charges; to file a complaint".
 *  7. The file's own order — ids are line numbers — so the order is stable.
 *
 * Measured on the words the splitter makes of 44,590 Tatoeba sentences. Of
 * the longer words with several readings, counted as often as they turn up,
 * 89 in 100 come out with their everyday reading first. 多少, 妻子, 教授 and
 * 生意 do not: their two entries are level on every count, and the file's
 * order has duō shǎo, qī zǐ, jiāo shòu and shēng yì first.
 *
 * No step prefers a reading whose last syllable is neutral. It is the everyday
 * one of 东西, 地方 and 妻子 and the unusual one of 不是, 女人 and 过去: tried
 * on those sentences, it put 281 words right and 912 wrong.
 */
export function rank(entries: Entry[], key: string, hint: CedictHint = {}): Entry[] {
  const asked = hint.reading ? foldPinyin(hint.reading) : undefined;
  const usual = usualReading(key);

  const score = (e: Entry): number[] => {
    const reading = e.reading ? foldPinyin(e.reading) : undefined;
    const n = meanings(e);
    return [
      Number(asked !== undefined && reading === asked),
      Number(usual !== undefined && reading === usual),
      Number(!isName(e)),
      Number(n > 0),
      Number(!isVariant(e)),
      n,
    ];
  };

  const scored = entries.map((e) => ({ e, s: score(e) }));
  scored.sort((a, b) => {
    for (let i = 0; i < a.s.length; i++) {
      const d = (b.s[i] ?? 0) - (a.s[i] ?? 0);
      if (d) return d;
    }
    const ai = Number(a.e.id);
    const bi = Number(b.e.id);
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
    return a.e.id.localeCompare(b.e.id);
  });
  return scored.map((x) => written(x.e, key, hint));
}

/** The reading drawn above a word when nothing says otherwise: the top-ranked entry's. */
export function defaultReading(key: string, entries: Entry[]): string | undefined {
  return rank(entries, key)[0]?.reading;
}
