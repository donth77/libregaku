import { furigana } from '../morphology/furigana';
import type { Token } from '../morphology/types';

/**
 * A line for a card's Reading field: its words as written, with a reading
 * over each word that showed one on screen.
 *
 * The card shows the line the way it was read — by default, readings over
 * the words not learned yet — rather than spelling out every word, or none.
 */
export function lineReading(
  tokens: readonly Token[], shows: (t: Token) => boolean,
): Array<{ text: string; ruby?: string }> {
  return tokens.flatMap((t) =>
    t.punct || !t.reading || !shows(t) ? [{ text: t.surface }] : furigana(t.surface, t.reading));
}
