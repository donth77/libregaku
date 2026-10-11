import { analyse, LineCache } from './analyser';
import { koCueTokens, koStretches, type KoMorpheme } from './merge-ko';
import type { RubySegment, Segmenter, Token } from './types';

/**
 * Korean, from the analyser in the offscreen document.
 *
 * The analyser reports morphemes — a stem, each ending, each particle — and
 * the merge rules (merge-ko.ts) join them into the words a learner looks up.
 *
 * It is not asked about a cue as the cue stands. Each speaker's words go to
 * it on their own, from their first letter to their last and with a full
 * stop on, because that is how ko-dic reads them best (koStretches() has the
 * measure). So a cue of two speakers is two requests, the first time it is
 * seen, and a cue of nothing but marks is none.
 */
export class KoreanSegmenter implements Segmenter {
  readonly tier = 2 as const;
  readonly hasLemma = true;

  readonly #cache = new LineCache();

  async segment(text: string): Promise<Token[]> {
    const hit = this.#cache.get(text);
    if (hit) return hit;
    const answers = await Promise.all(koStretches(text).map((stretch) => analyse<KoMorpheme>(stretch.ask)));
    const tokens = koCueTokens(text, answers.map((answer) => answer.tokens));
    this.#cache.set(text, tokens);
    return tokens;
  }

  /** Hangul is written as it sounds; nothing goes above it. */
  ruby(surface: string): RubySegment[] {
    return [{ text: surface }];
  }
}
