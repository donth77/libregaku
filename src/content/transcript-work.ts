import type { Segmenter, Token } from '../morphology/types';
import type { Line } from './transcript';

/**
 * The transcript panel's share of the analyser, kept small on purpose.
 *
 * A film is a few thousand lines, and the analyser lives in the offscreen
 * document, one message per line. The panel used to ask for every line twice
 * whenever anything changed — once to draw it, once to count it — all at once.
 * What is here makes each line cost one request per analysis, however many
 * parts of the panel want its words, and lets a request already on its way
 * answer everyone who asks while it is.
 */

export interface Count {
  unknown: number;
  words: number;
}

/**
 * Content words in a line, and how many of them are unknown.
 *
 * The same rule the player uses for the same numbers, so the transcript's
 * count and the header's can never disagree about what counts as a word.
 */
export function countWords(tokens: readonly Token[], statusOf: (t: Token) => string): Count {
  let words = 0;
  let unknown = 0;
  for (const t of tokens) {
    if (!t.content || t.punct) continue;
    words++;
    if (statusOf(t) === 'unknown') unknown++;
  }
  return { words, unknown };
}

/**
 * Tokens per line of text, for one analysis at a time.
 *
 * Keyed by text, so a line that recurs — はい, うん — is analysed once. A new
 * analysis (a better analyser, or the same one with its dictionary arrived)
 * starts over, and anything still arriving for the old one is dropped rather
 * than mixed in.
 */
export class TokenCache {
  #seg: Segmenter | null = null;
  #revision = 0;
  #done = new Map<string, Token[]>();
  #pending = new Map<string, Promise<Token[]>>();

  /** Bumped by every reset, so work begun for an older analysis can tell. */
  get revision(): number {
    return this.#revision;
  }

  /** The analyser these tokens came from. */
  get segmenter(): Segmenter | null {
    return this.#seg;
  }

  /** Forget everything, and analyse with this from now on. */
  reset(seg: Segmenter | null): void {
    this.#seg = seg;
    this.#revision++;
    this.#done.clear();
    this.#pending.clear();
  }

  /** Tokens already in hand for this text — never a request. */
  peek(text: string): Token[] | undefined {
    return this.#done.get(text);
  }

  /**
   * Tokens for this text: at once when they are known, otherwise the one
   * request for it, shared with whoever else is waiting. Null means there is
   * no analyser at all, and the text is only text.
   */
  get(text: string): Token[] | Promise<Token[]> | null {
    const seg = this.#seg;
    if (!seg) return null;
    const done = this.#done.get(text);
    if (done) return done;
    const pending = this.#pending.get(text);
    if (pending) return pending;

    const revision = this.#revision;
    let result: Token[] | Promise<Token[]>;
    try {
      result = seg.segment(text);
    } catch (e) {
      return Promise.reject(e);
    }
    if (Array.isArray(result)) {
      this.#done.set(text, result);
      return result;
    }
    const request = result.then(
      (tokens) => {
        if (revision === this.#revision) {
          this.#done.set(text, tokens);
          this.#pending.delete(text);
        }
        return tokens;
      },
      (e: unknown) => {
        if (revision === this.#revision) this.#pending.delete(text);
        throw e;
      },
    );
    this.#pending.set(text, request);
    return request;
  }
}

/** Unified CJK, kana and full-width forms: one glyph is about one em wide. */
const WIDE = /[　-鿿가-힯豈-﫿＀-￯]/;

/**
 * How tall a line's card will probably be, before it has been laid out.
 *
 * Only a first guess for rows the browser has not drawn yet — once drawn, a
 * row's real size is remembered and used instead. It matters for one thing:
 * how far down a line far from the top sits before anything near it has been
 * drawn, which decides how close a jump there lands before it settles.
 * Figures follow the card's own styles: 21px text at 1.7, a 14.5px
 * translation at 1.6, the timing row, padding, border and gap.
 */
export function estimateRowHeight(line: Line, panelWidth: number): number {
  const inner = Math.max(120, panelWidth - 24 - 34);
  // UTF-16 length rather than code points: a guess either way, and this one
  // costs nothing for a film's worth of lines.
  const perLine = (text: string, px: number): number => {
    const glyph = WIDE.test(text) ? px : px * 0.55;
    return Math.max(1, Math.ceil((text.length * glyph) / inner));
  };
  let h = 27 + perLine(line.text, 21) * 36 + 24 + 10;
  if (line.secondary) h += 6 + perLine(line.secondary, 14.5) * 23;
  return h;
}

export const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * On the next frame where there is one, soon where there is not. Returns the
 * way to call it off: frame and timer ids are separate counters, so cancelling
 * with the wrong one could stop somebody else's timer.
 */
export function nextFrame(fn: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(id);
  }
  const id = window.setTimeout(fn, 16);
  return () => clearTimeout(id);
}

/**
 * When the page has nothing better to do — but within a fifth of a second
 * regardless, so background work on a busy page still finishes. Returns the
 * way to call it off.
 */
export function whenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => fn(), { timeout: 200 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 0);
  return () => clearTimeout(id);
}
