/**
 * The player's keys.
 *
 * Line keys follow asbplayer's, which learners already know: ← and → move a
 * line at a time, ↓ hears the line again. Letters avoid the ones the players
 * claim — Space, F, M, C, T, I, and J/K/L on YouTube — except where the
 * clash is worth it and scoped: K marks a word known only while its card is
 * open, so everywhere else it is still YouTube's play/pause.
 */

export type KeyAction =
  | 'previous'   // ← the line before
  | 'next'       // → the line after
  | 'replay'     // ↓ this line again
  | 'second'     // ↑ the second line, on or off
  | 'furigana'   // R furigana: off, new words, all
  | 'blur'       // H blur the line until hovered
  | 'add'        // A a card for the word looked up
  | 'known'      // K mark it known
  | 'save'       // B save the line
  | 'panel';     // S the transcript panel

const ARROWS: Record<string, KeyAction> = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
  ArrowDown: 'replay',
  ArrowUp: 'second',
};

const LETTERS: Record<string, KeyAction> = {
  r: 'furigana',
  h: 'blur',
  a: 'add',
  k: 'known',
  b: 'save',
  s: 'panel',
};

/** What a key press asks for, or null for one that is not ours. */
export function keyAction(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
): KeyAction | null {
  // Browser and system shortcuts are never ours.
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  // Shift+arrow belongs to the page — selection, and YouTube's own keys. A
  // shifted letter is still the letter: caps lock should not turn them off.
  if (e.key in ARROWS) return e.shiftKey ? null : ARROWS[e.key] ?? null;
  return LETTERS[e.key.toLowerCase()] ?? null;
}

/** The keys that move between lines, which only mean something with a whole track. */
export function isLineKey(a: KeyAction): a is 'previous' | 'next' | 'replay' | 'second' {
  return a === 'previous' || a === 'next' || a === 'replay' || a === 'second';
}

/** Whether a key press is someone typing, which always keeps its letter. */
export function isTyping(e: Pick<KeyboardEvent, 'composedPath' | 'target' | 'isComposing'>): boolean {
  if (e.isComposing) return true;
  // composedPath() sees through shadow roots, so the search box inside our
  // own panel counts as a field too — e.target would only show its host.
  const t = (e.composedPath()[0] ?? e.target) as HTMLElement | null;
  return Boolean(t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName ?? '')));
}
