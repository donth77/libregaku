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

const CONTAINER = '.ytp-caption-window-container';
const SEGMENT = '.ytp-caption-segment';

export class DomCaptionSource {
  #observer: MutationObserver | null = null;
  #last = '';
  #onCue: ((text: string) => void) | null = null;

  static container(): HTMLElement | null {
    return document.querySelector<HTMLElement>(CONTAINER);
  }

  /** Current caption text, or '' when nothing is showing. */
  static read(): string {
    const segs = document.querySelectorAll<HTMLElement>(SEGMENT);
    if (!segs.length) return '';
    return Array.from(segs)
      .map((s) => s.textContent ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  start(onCue: (text: string) => void): boolean {
    const root = DomCaptionSource.container();
    if (!root) return false;

    this.#onCue = onCue;
    this.#observer = new MutationObserver(() => this.#emit());
    this.#observer.observe(root, { childList: true, subtree: true, characterData: true });
    this.#emit();
    return true;
  }

  #emit(): void {
    const text = DomCaptionSource.read();
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
