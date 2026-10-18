import type { RubySegment } from '../morphology/types';

/**
 * Room for a reading that is wider than the characters it stands over.
 *
 * Readings are drawn out of flow, centred on their characters, so a long one
 * hung over whatever stood beside it: five kana over the one kanji of 承り ran
 * into the reading of the word before, and looked as if it belonged to both.
 *
 * The rule is the one Japanese typesetting uses. A reading may hang over a
 * neighbour that has no reading of its own (kana, a mark) by up to one of its
 * own characters, and a little past the end of a line; it may not hang over a
 * neighbour that has a reading, and keeps a hair's gap from it. Whatever is
 * left over becomes space beside the characters, on the side that needs it,
 * so they stay centred under their reading wherever that is possible.
 * So わたし over 私 beside は costs nothing, おとこ and おんな over 男女 lean
 * apart, and 承 gets the room its reading needs and no more.
 *
 * Pure, so it is tested without a browser.
 */

/** How far a reading may hang over what stands beside it, in em of the text below. */
export const FREE = 0.46; // over text with no reading: one of the reading's own characters
export const EDGE = 0.25; // past the end of a line: within the line's own padding
export const SHUT = -0.06; // beside another reading: not at all, and this much short of it

export interface Room {
  /** Space before and after the characters, in em of their text. */
  left: number;
  right: number;
  /** How far right of the middle of that widened box the reading's own middle sits, in em of the text below. */
  lean: number;
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * A reading in Latin letters: pinyin, Jyutping. Its letters are narrower than
 * kana, so roomFor(), which counts characters, would part the characters under
 * it far too wide. It is measured where it is drawn instead, by a hidden copy
 * of itself that widens its character's box (data-r).
 */
export function romanised(reading: string): boolean {
  return /^[\x21-\x7eÀ-ɏ̀-ͯ]+$/.test(reading);
}

/**
 * What a reading needs beyond its characters, or null when it fits.
 * `unit` is the width of one reading character in em of the text below;
 * `before` and `after` are how far it may hang over each side (FREE, EDGE or SHUT).
 */
export function roomFor(base: string, reading: string, before: number, after: number, unit: number): Room | null {
  const excess = [...reading].length * unit - [...base].length;
  if (excess <= 0) return null;
  // As even as the two sides allow, then whatever one side cannot take goes to the other.
  let overLeft = Math.min(before, excess / 2);
  const overRight = Math.min(after, excess - overLeft);
  overLeft = Math.min(before, excess - overRight);
  const pad = Math.max(0, excess - overLeft - overRight);

  // The characters stay under the middle of the reading when each side has room for its half.
  let left = excess / 2 - overLeft;
  let right = excess / 2 - overRight;
  let shift = 0;
  if (left < 0) {
    // More hangs to the left than half: no space there, and the reading leans left.
    shift = left;
    left = 0;
    right = pad;
  } else if (right < 0) {
    shift = -right;
    right = 0;
    left = pad;
  }
  return { left: round(left), right: round(right), lean: round((left - right) / 2 + shift) };
}

/** A line as it is drawn: each word's segments, a mark between words, or a break in the line. */
export type Drawn = readonly RubySegment[] | 'mark' | 'break';

/**
 * How far a reading over segment `i` of word `j` may hang over what stands
 * before and after it.
 */
export function sidesOf(line: readonly Drawn[], j: number, i: number): [number, number] {
  const word = line[j];
  if (!Array.isArray(word)) return [SHUT, SHUT];
  const segs = word as readonly RubySegment[];
  const beside = (entry: Drawn | undefined, end: 'first' | 'last'): number => {
    if (entry === undefined || entry === 'break') return EDGE;
    if (entry === 'mark') return FREE;
    const seg = end === 'last' ? entry[entry.length - 1] : entry[0];
    return seg?.ruby ? SHUT : FREE;
  };
  const own = (seg: RubySegment | undefined): number => (seg?.ruby ? SHUT : FREE);
  const before = i > 0 ? own(segs[i - 1]) : beside(line[j - 1], 'last');
  const after = i < segs.length - 1 ? own(segs[i + 1]) : beside(line[j + 1], 'first');
  return [before, after];
}
