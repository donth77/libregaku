import type { Cue } from './types';

/** How close the second half of a line split at a cut starts to the end of the first. */
const REPEAT_GAP = 0.25;

/**
 * One line shown across a cut is often two cues in the file: the same words,
 * the second starting as the first ends. The transcript listed such a line
 * twice, and a translation paired to both halves came out twice. Merged, it
 * is one line again. Expects cues in order of start.
 */
export function mergeRepeats(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    const last = out[out.length - 1];
    if (last && last.text.trim() === cue.text.trim() && cue.start >= last.start && cue.start - last.end <= REPEAT_GAP) {
      out[out.length - 1] = { ...last, end: Math.max(last.end, cue.end) };
      continue;
    }
    out.push(cue);
  }
  return out;
}

/** How long two cues share on screen, in seconds; zero or less when they do not. */
function shared(a: { start: number; end: number }, b: { start: number; end: number }): number {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start);
}

/** Overlap below this is a shared edge, not two cues on screen together. */
const EDGE = 0.05;

/**
 * Attach a native-language line to each target-language cue.
 *
 * The two tracks are authored independently — Japanese captions follow the
 * audio, English subtitles follow the localisation — so they do not share cue
 * boundaries and never will. Matching is by time overlap: one primary cue may
 * span two secondary ones, and one secondary may span a primary sentence the
 * captions split in two, and then both halves carry it.
 *
 * But not two primary cues on screen at the same time. A line and an
 * interjection shown together (不安定な…のか, and 何？ beside it) both overlap
 * the one English line, which belongs to the one it covers most; the other
 * has no translation of its own, rather than a copy of its neighbour's.
 */
export function pairCues(primary: Cue[], secondary: Cue[], offset = 0): Cue[] {
  if (!secondary.length) return primary;

  const sorted = mergeRepeats([...secondary].sort((a, b) => a.start - b.start));
  const at = (cue: Cue): { start: number; end: number } => ({ start: cue.start + offset, end: cue.end + offset });

  // Each primary cue's overlapping secondaries, and how much of each it has.
  let from = 0;
  const hits = primary.map((cue) => {
    const span = at(cue);
    // The primary list is sorted, so the search window only moves forward.
    while (from < sorted.length && (sorted[from]?.end ?? 0) < span.start) from++;
    const found: Array<{ j: number; o: number }> = [];
    for (let j = from; j < sorted.length; j++) {
      const s = sorted[j]!;
      if (s.start > span.end) break;
      const o = shared(span, s);
      if (o > EDGE) found.push({ j, o });
    }
    return found;
  });

  // The primary cues on screen together with each.
  const together = primary.map((cue, i) => {
    const others: number[] = [];
    for (let k = 0; k < primary.length; k++) {
      if (k !== i && shared(cue, primary[k]!) > EDGE) others.push(k);
    }
    return others;
  });

  /** A cue on screen with this one has more of that secondary: the translation is that cue's. */
  const outdone = (i: number, j: number, o: number): boolean =>
    together[i]!.some((k) => {
      const theirs = hits[k]!.find((h) => h.j === j)?.o ?? 0;
      return theirs > o || (theirs === o && k < i);
    });

  return primary.map((cue, i) => {
    const kept = hits[i]!.filter(({ j, o }) => !outdone(i, j, o)).map(({ j }) => sorted[j]!.text);
    // A track can repeat a line too; once is enough.
    const texts = [...new Set(kept)];
    return texts.length ? { ...cue, secondary: texts.join(' ') } : cue;
  });
}
