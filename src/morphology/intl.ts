import type { Segmenter, Token } from './types';

/**
 * Tier 0 — `Intl.Segmenter`, built into the browser.
 *
 * Every language, zero bytes, ICU-backed. Boundaries only: no lemma, so an
 * inflected surface will not match a card stored under its dictionary form.
 * `hasLemma` is false precisely so the UI can say that out loud.
 */
export class IntlSegmenter implements Segmenter {
  readonly tier = 0 as const;
  readonly hasLemma = false;

  readonly #seg: Intl.Segmenter;

  constructor(locale: string) {
    this.#seg = new Intl.Segmenter(locale, { granularity: 'word' });
  }

  static get supported(): boolean {
    return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
  }

  segment(text: string): Token[] {
    const out: Token[] = [];
    for (const part of this.#seg.segment(text)) {
      // Non-word segments are kept, not dropped: discarding them loses the
      // punctuation and the spaces, and the line no longer reads as written.
      out.push({
        surface: part.segment,
        start: part.index,
        end: part.index + part.segment.length,
        content: part.isWordLike, // tier 0 cannot tell content from function words
        punct: !part.isWordLike,
      });
    }
    return out;
  }
}
