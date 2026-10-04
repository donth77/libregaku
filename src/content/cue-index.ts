import type { Cue } from '../adapters/types';

/**
 * How far before a line's start still counts as being at it.
 *
 * A seek lands where the player can put it, which is not always to the
 * hundredth. Arriving 0.1 s short of a line made "next" pick that same line
 * again, so a second press appeared to do nothing.
 */
const SLACK = 0.25;

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

  /*
   * Where the line keys go from `t`. Each answers with a time to seek to, or
   * null when there is nowhere to go.
   */

  /** The latest line to have started by `t` — the one playing, or the last one heard — or -1 before the first. */
  latest(t: number): number {
    let lo = 0;
    let hi = this.#cues.length - 1;
    let last = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((this.#cues[mid]?.start ?? Infinity) <= t + SLACK) {
        last = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return last;
  }

  /** The start of the line playing, or of the last one heard. */
  replay(t: number): number | null {
    return this.#cues[this.latest(t)]?.start ?? null;
  }

  /**
   * The start of the line before the one playing. Between lines it is the one
   * just heard, which is what "the previous line" means to someone who has
   * just heard it. The first line has nothing before it, so it starts again.
   */
  previous(t: number): number | null {
    const i = this.latest(t);
    const now = this.#cues[i];
    if (!now) return null;
    if (t >= now.end) return now.start;
    // Two speakers can start together; the line before is the one that
    // started earlier, not the other half of this one.
    let j = i - 1;
    while (j >= 0 && (this.#cues[j]?.start ?? -Infinity) >= now.start) j--;
    return this.#cues[j]?.start ?? now.start;
  }

  /** The start of the first line after the one playing, or null after the last. */
  next(t: number): number | null {
    return this.#cues[this.latest(t) + 1]?.start ?? null;
  }
}
