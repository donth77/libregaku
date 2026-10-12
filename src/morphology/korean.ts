import { analyse, LineCache } from './analyser';
import { koCueTokens, koStretches, type KoMorpheme } from './merge-ko';
import type { RubySegment, Segmenter, Token } from './types';

/** What Korean puts on a noun to make another word of it: 한국식, 실용적, 현대화, 가능성. */
const DERIVED = /^(\p{Script=Hangul}{2,})(적|식|화|별|형|성|용|감|력)$/u;

/**
 * Verbs that are another verb after something: 날아다니다 is 날아 and 다니다, 킥킥대다 a sound and 대다.
 * The dictionary has the last one, and what it says of it stands for the word where it has none of the whole.
 */
const VERB_ENDS = /^\p{Script=Hangul}{2,}(다니다|대다|내다|버리다|놓다|오다|가다)$/u;

/** The line's words that end in a suffix or a verb, with the word it may be made of: for a lookup that finds nothing. */
export function withDerivations(tokens: Token[]): Token[] {
  return tokens.map((t) => {
    if (t.punct) return t;
    const suffixed = DERIVED.exec(t.surface);
    if (suffixed) return { ...t, derived: [suffixed[1] ?? '', `-${suffixed[2]}`] };
    const verb = t.lemma ? VERB_ENDS.exec(t.lemma) : null;
    return verb ? { ...t, derived: [verb[1] ?? ''] } : t;
  });
}

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
    const tokens = withDerivations(koCueTokens(text, answers.map((answer) => answer.tokens)));
    this.#cache.set(text, tokens);
    return tokens;
  }

  /** Hangul is written as it sounds; nothing goes above it. */
  ruby(surface: string): RubySegment[] {
    return [{ text: surface }];
  }
}
