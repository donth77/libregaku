import type { RubySegment, Token } from '../morphology/types';

/**
 * A line for a card's Reading field: its words as written, with a reading
 * over each word that showed one on screen.
 *
 * The card shows the line the way it was read — by default, readings over
 * the words not learned yet — rather than spelling out every word, or none.
 * `ruby` is how the language draws a word's reading over it.
 */
export function lineReading(
  tokens: readonly Token[], shows: (t: Token) => boolean, ruby: (t: Token) => RubySegment[],
): RubySegment[] {
  return tokens.flatMap((t) => (t.punct || !t.reading || !shows(t) ? [{ text: t.surface }] : ruby(t)));
}
