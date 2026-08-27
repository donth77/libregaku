import type { Cue } from './types';

/**
 * Attach a native-language line to each target-language cue.
 *
 * The two tracks are authored independently — Japanese captions follow the
 * audio, English subtitles follow the localisation — so they do not share cue
 * boundaries and never will. Matching is by time overlap, and one primary cue
 * may legitimately span two secondary ones.
 */
export function pairCues(primary: Cue[], secondary: Cue[], offset = 0): Cue[] {
  if (!secondary.length) return primary;

  const sorted = [...secondary].sort((a, b) => a.start - b.start);
  let from = 0;

  return primary.map((cue) => {
    const start = cue.start + offset;
    const end = cue.end + offset;

    // The primary list is sorted, so the search window only moves forward.
    while (from < sorted.length && (sorted[from]?.end ?? 0) < start) from++;

    const hits: string[] = [];
    for (let i = from; i < sorted.length; i++) {
      const s = sorted[i]!;
      if (s.start > end) break;
      // Require real overlap, not a shared edge.
      const overlap = Math.min(end, s.end) - Math.max(start, s.start);
      if (overlap > 0.05) hits.push(s.text);
    }

    return hits.length ? { ...cue, secondary: hits.join(' ') } : cue;
  });
}
