import type { Cue } from '../adapters/types';

/**
 * Which cues are on screen at a given moment.
 *
 * Cues overlap in real tracks — a sign held on screen while dialogue runs
 * under it, two speakers at once. A binary search that assumes they don't
 * drops the longer cue for as long as the shorter ones last, and shows
 * nothing at all between them.
 *
 * Cues must be sorted by start, which every parser guarantees.
 */
export class CueIndex {
  readonly #cues: readonly Cue[];
  /** reach[i] = the latest end among cues[0..i], so a scan back can stop early. */
  readonly #reach: number[] = [];

  constructor(cues: readonly Cue[]) {
    this.#cues = cues;
    let furthest = -Infinity;
    for (const c of cues) {
      furthest = Math.max(furthest, c.end);
      this.#reach.push(furthest);
    }
  }

  /** Indexes of every cue covering `t`, earliest first. */
  at(t: number): number[] {
    let lo = 0;
    let hi = this.#cues.length - 1;
    let last = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = this.#cues[mid];
      if (!c) break;
      if (c.start <= t) {
        last = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    const out: number[] = [];
    for (let i = last; i >= 0 && (this.#reach[i] ?? -Infinity) >= t; i--) {
      if ((this.#cues[i]?.end ?? -Infinity) >= t) out.push(i);
    }
    return out.reverse();
  }
}
