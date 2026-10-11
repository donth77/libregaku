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

/**
 * What a key press asks for, or null for one that is not ours.
 *
 * `singleKeys` is the setting of that name. Off, a letter is ours only with
 * Alt and Shift held, so typing or speaking a word over the page sets nothing
 * off (WCAG 2.1.4); the arrows are unchanged.
 */
export function keyAction(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> & { code?: string },
  singleKeys = true,
): KeyAction | null {
  // Browser and system shortcuts are never ours.
  if (e.metaKey || e.ctrlKey) return null;
  // Shift+arrow belongs to the page — selection, and YouTube's own keys. A
  // shifted letter is still the letter: caps lock should not turn them off.
  if (e.key in ARROWS) return e.shiftKey || e.altKey ? null : ARROWS[e.key] ?? null;
  if (singleKeys) return e.altKey ? null : LETTERS[e.key.toLowerCase()] ?? null;
  if (!e.altKey || !e.shiftKey) return null;
  // On a Mac, Alt (Option) turns the letter into another character: Å for A.
  // Its key is still the same key.
  const letter = e.key.toLowerCase();
  return LETTERS[letter] ?? LETTERS[/^Key([A-Z])$/.exec(e.code ?? '')?.[1]?.toLowerCase() ?? ''] ?? null;
}

/**
 * A letter key as the player's tooltips and assistive tech name it: alone,
 * or with Alt and Shift while single-key shortcuts are off.
 */
export function letterKey(letter: string, singleKeys: boolean): { shown: string; aria: string } {
  const keys = singleKeys ? letter : `Alt+Shift+${letter}`;
  return { shown: keys, aria: keys };
}

/** The keys a focused control uses itself: moving along it, and pressing it. */
const CONTROL_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ']);

/**
 * Of those, the ones a focused word of the subtitle uses: along its line, and
 * pressing it. A click leaves the focus on a word, so ↑ and ↓ stay the
 * player's there — the translation, and the line again.
 */
const WORD_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ']);

/** Controls that keep those keys while they have the focus. */
const CONTROL = '[role=tab],[role=option],[role=separator],[role=button],button,input,select,textarea';

/**
 * Of those, the ones that keep them on the site's own page too. A site's
 * buttons have no use for an arrow, and the players leave one focused after
 * every click: → after clicking play must still move a line.
 */
const SITE_CONTROL = '[role=tab],[role=option],[role=separator],input,select,textarea';

/** Everything we draw over a page, each in a shadow root of its own. */
const OURS = '.libregaku-root, .libregaku-sidebar, .libregaku-popup, #libregaku-header, .libregaku-notice, .libregaku-flash';

/**
 * Whether a key belongs to the focused control rather than to the player:
 * an arrow, Home, End, Enter or Space on the panel, on the card, or on a tab,
 * an option, a divider, a button or a field; on a word of the subtitle, all
 * of them but ↑ and ↓. → on a focused panel tab used to seek the video, and
 * ↓ in the transcript turned the translation on and off.
 */
export function isControlKey(e: Pick<KeyboardEvent, 'key' | 'composedPath'>): boolean {
  if (!CONTROL_KEYS.has(e.key)) return false;
  // composedPath() sees through shadow roots, to the element with the focus
  // and every host it sits in; e.target would only show the outermost host.
  const path = e.composedPath();
  const focused = path[0];
  if (!(focused instanceof Element)) return false;
  const inside = (selector: string): boolean => path.some((n) => n instanceof Element && n.matches(selector));
  if (inside('.libregaku-sidebar, .libregaku-popup')) return true;
  // Before the rule for buttons: a word is one, and keeps fewer keys.
  if (focused.matches('.t') && inside('.libregaku-root')) return WORD_KEYS.has(e.key);
  return focused.matches(CONTROL) && (focused.matches(SITE_CONTROL) || inside(OURS));
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
