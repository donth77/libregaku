import type { Cue } from '../adapters/types';

/**
 * What the sidebar shows.
 *
 * Two sources, and they are not equivalent. A fetched track gives the whole
 * transcript up front — you can read ahead, jump anywhere, see what is coming.
 * DOM reading gives one line at a time, so the transcript can only accumulate
 * as you watch.
 *
 * Rather than block the sidebar on a full track we cannot always get, it works
 * from either and says which it has. A partial transcript is still worth
 * having; pretending it is complete is not.
 */

export type TranscriptMode = 'full' | 'accumulating';

export interface Line {
  start: number;
  end: number;
  text: string;
  secondary?: string;
}

export class Transcript {
  #lines: Line[] = [];
  #mode: TranscriptMode = 'accumulating';
  #seen = new Set<string>();
  #onChange: (() => void) | null = null;

  get mode(): TranscriptMode {
    return this.#mode;
  }

  get lines(): readonly Line[] {
    return this.#lines;
  }

  onChange(cb: () => void): void {
    this.#onChange = cb;
  }

  /** A complete track replaces anything accumulated. */
  setFull(cues: Cue[]): void {
    this.#lines = cues.map((c) => ({ start: c.start, end: c.end, text: c.text, secondary: c.secondary }));
    this.#mode = 'full';
    this.#seen = new Set(this.#lines.map((l) => l.text));
    this.#onChange?.();
  }

  /**
   * Record a line observed on screen. Deduplicated by text, because the player
   * re-renders the same caption many times while it is displayed.
   */
  observe(text: string, at: number): void {
    if (this.#mode === 'full') return;
    const t = text.trim();
    if (!t || this.#seen.has(t)) return;

    this.#seen.add(t);
    this.#lines.push({ start: at, end: at + 4, text: t });
    // Seeking backwards can observe an earlier line later.
    this.#lines.sort((a, b) => a.start - b.start);
    this.#onChange?.();
  }

  /** Index of the line covering `t`, or the nearest preceding one. */
  activeAt(t: number): number {
    let lo = 0;
    let hi = this.#lines.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const l = this.#lines[mid];
      if (!l) break;
      if (l.start <= t) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best < 0) return -1;
    const l = this.#lines[best]!;
    return t <= l.end + 0.5 ? best : -1;
  }

  search(query: string): number[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: number[] = [];
    this.#lines.forEach((l, i) => {
      if (l.text.toLowerCase().includes(q) || l.secondary?.toLowerCase().includes(q)) out.push(i);
    });
    return out;
  }

  clear(): void {
    this.#lines = [];
    this.#seen.clear();
    this.#mode = 'accumulating';
    this.#onChange?.();
  }
}
