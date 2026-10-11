import { cardDeck, settings } from '../settings';
import { createDeck } from './client';
import { defaultDeck } from './model';

/** The languages' own decks made, or found there, since this page loaded. */
const made = new Set<string>();

/**
 * The deck to add a card to, there when it is needed.
 *
 * A language whose deck was never chosen has its own (cardDeck), and that
 * deck exists only once something goes into it: its first card makes it.
 * Asked of Anki once a page, since making a deck that is there changes
 * nothing. A deck the learner chose is theirs — if Anki no longer has it,
 * adding to it fails and says so, rather than making it again behind them.
 * Throws when Anki cannot make the deck: closed, above all.
 */
export async function readyDeck(): Promise<string> {
  const s = settings();
  const deck = cardDeck(s);
  if (deck !== defaultDeck(s.target) || made.has(deck)) return deck;
  await createDeck(deck);
  made.add(deck);
  return deck;
}
