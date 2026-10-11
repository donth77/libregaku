import type { RubySegment, Segmenter, Token } from './types';

/**
 * A word in pieces with the reading over each, as its language draws it —
 * and the bare word while nothing is analysing yet. For whatever draws a
 * line: the overlay, the transcript, a card.
 */
export function rubyOf(seg: Segmenter | null | undefined, tok: Pick<Token, 'surface' | 'reading'>): RubySegment[] {
  return seg ? seg.ruby(tok.surface, tok.reading) : [{ text: tok.surface }];
}
