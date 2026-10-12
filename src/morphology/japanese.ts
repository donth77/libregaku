import { reread } from './katakana-words';
import type { Morpheme } from './merge';
import { repair, type Others } from './repair';
import { fromUnidic } from './unidic';

/**
 * A Japanese line as the merge rules take it, from what the analysers return.
 *
 * It runs wherever the analysers do — the offscreen document, and the scripts
 * that measure them in Node — so both read a line by the same steps: IPADIC's
 * rows, read again where an adjective is written as IPADIC does not know it
 * (katakana-words.ts), then put right by UniDic where UniDic is loaded
 * (repair.ts).
 */

/** A row as Lindera gives it. */
export interface Row {
  surface: string;
  details: string[];
}

/** Where IPADIC keeps what is read from it, as indices into `details`. */
export const IPADIC = { pos: 0, pos1: 1, conjForm: 5, base: 6, reading: 7 };

/**
 * How many of IPADIC's readings of a stretch are asked for. A clause has one
 * or two within reach of its likeliest (WITHIN in repair.ts), and fifteen at
 * the most among 6,450 of Tatoeba's.
 */
export const READINGS = 128;

/** `details[i]`, or undefined for the "*" a dictionary writes where it has nothing. */
const col = (d: string[], i: number): string | undefined => {
  const v = d[i];
  return v && v !== '*' ? v : undefined;
};

/** One of IPADIC's rows as the merge rules take it. */
export function fromIpadic(surface: string, d: string[]): Morpheme {
  // Unknown words carry no lemma or reading — "*", or a short row.
  const usable = d.length > IPADIC.reading;
  return {
    surface,
    lemma: usable ? col(d, IPADIC.base) : undefined,
    reading: usable ? col(d, IPADIC.reading) : undefined,
    pos: col(d, IPADIC.pos),
    pos1: col(d, IPADIC.pos1),
    conjForm: col(d, IPADIC.conjForm),
  };
}

/** The analysers a line is read with. */
export interface Analysers {
  /** IPADIC's rows for a text. */
  ipadic(text: string): Row[];
  /**
   * IPADIC's readings of a stretch with no mark or space in it: the likeliest
   * first, each cut differently, none costing more than `within` above the
   * first. Lindera's n-best.
   */
  others?(text: string, within: number): Array<{ rows: Row[]; cost: number }>;
  /** UniDic's rows for a text, once UniDic is loaded: the line is IPADIC's alone until then. */
  unidic?(text: string): Row[];
}

/** A line, read. */
export function readJapanese(text: string, by: Analysers): Morpheme[] {
  // ヤバくない, すげえ: adjectives written as IPADIC does not know them, read again written out.
  const again = reread(text, (t) => by.ipadic(t).map((row) => ({
    ...row,
    adjective: row.details[IPADIC.pos] === '形容詞',
    known: row.details.length > IPADIC.reading,
    stem: row.details[IPADIC.conjForm] === 'ガル接続',
  })));
  const writtenOut = again !== null && again.words.reduce((n, w) => n + w.surface.length, 0) === text.length;
  const rows = writtenOut ? again.words : by.ipadic(text);
  let words = rows.map((row) => fromIpadic(row.surface, row.details));
  if (by.unidic) {
    const ask = by.others;
    const others: Others | undefined = ask &&
      ((t, within) => ask(t, within).map((r) => ({ words: r.rows.map((row) => fromIpadic(row.surface, row.details)), cost: r.cost })));
    words = repair(words, fromUnidic(by.unidic(text)), others);
  }
  if (!writtenOut) return words;
  // Each word as it was written: the line read written out is the same length, character for character.
  let at = 0;
  return words.map((w) => {
    const written = text.slice(at, at + w.surface.length);
    at += w.surface.length;
    return { ...w, surface: written };
  });
}
