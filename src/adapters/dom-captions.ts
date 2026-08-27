import type { Cue } from './types';

/**
 * Last-resort cue source: read the captions YouTube has already rendered.
 *
 * Fetching a timedtext URL requires a signed one, and there is no reliable way
 * to obtain it on every setup — the player API may report no tracks, and a bare
 * `baseUrl` returns an empty body. But if captions are visible, the text is
 * already in the DOM, and that is enough for a per-cue overlay.
 *
 * The trade-off is real and worth stating: this yields only the *current* line,
 * never the whole transcript. The sidebar will still need a fetched track.
 */

export interface DomCaptionSelectors {
  /** The element the site renders captions into. */
  container: string;
  /** Individual text runs within it. */
  segment: string;
  /** Join runs with this — Japanese needs no separator, English does. */
  join?: string;
}

export class DomCaptionSource {
  #observer: MutationObserver | null = null;
  #last = '';
  #onCue: ((text: string) => void) | null = null;
  readonly #sel: DomCaptionSelectors;

  constructor(selectors: DomCaptionSelectors) {
    this.#sel = selectors;
  }

  container(): HTMLElement | null {
    return document.querySelector<HTMLElement>(this.#sel.container);
  }

  /** Current caption text, or '' when nothing is showing. */
  read(): string {
    const root = this.container();
    if (!root) return '';
    const segs = root.querySelectorAll<HTMLElement>(this.#sel.segment);
    const parts = segs.length ? Array.from(segs) : [root];
    return parts
      .map((s) => s.textContent ?? '')
      .join(this.#sel.join ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  start(onCue: (text: string) => void): boolean {
    const root = this.container();
    if (!root) return false;

    this.#onCue = onCue;
    this.#observer = new MutationObserver(() => this.#emit());
    this.#observer.observe(root, { childList: true, subtree: true, characterData: true });
    this.#emit();
    return true;
  }

  #emit(): void {
    const text = this.read();
    if (text === this.#last) return;
    this.#last = text;
    this.#onCue?.(text);
  }

  stop(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#last = '';
  }
}

/** Kept for symmetry with fetched tracks. */
export function cueFromText(text: string, at: number): Cue {
  return { start: at, end: at + 4, text };
}
