import type { Token } from '../morphology/types';

/**
 * Selecting a phrase.
 *
 * The analyser splits 気にする into 気 + に + する, which is right for
 * grammar and useless for looking up the expression. A phrase is the
 * browser's own selection: dragging across words, or shift-clicking a second
 * one, selects text as it always has, and the words it touches become one
 * thing to look up. The text stays copyable, and a popup dictionary extension
 * that reads the selection still can.
 */

/** The words a selection in `root` touches inside `within`, in order. */
export function selectedWords(root: ShadowRoot, within: Element, selector: string): HTMLElement[] {
  // Chrome gives a shadow root its own selection; the document's would only
  // show the host.
  const sel = (root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  return Array.from(within.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.dataset.tok && range.intersectsNode(el),
  );
}

/** A phrase picked out on a line: its words, as written, and the word it ends on. */
export interface PhrasePick {
  words: Token[];
  text: string;
  last: HTMLElement;
}

/**
 * Mark the words a selection touches, and whatever lies between them, so the
 * line draws the selection itself: one band of even height across whole
 * words. The browser's own highlight drew a box per word, taller or shorter
 * as each had a reading or not, and stopped where the click landed. True
 * when a phrase — two words or more, on one line — is marked.
 */
export function markPhrase(root: ShadowRoot, within: Element, selector: string): boolean {
  for (const el of Array.from(within.querySelectorAll('.inphrase'))) el.classList.remove('inphrase', 'phrase-last');
  const picked = selectedWords(root, within, selector);
  const first = picked[0];
  const last = picked[picked.length - 1];
  if (picked.length < 2 || !first || !last || first.parentNode !== last.parentNode) return false;
  for (let n: Element | null = first; n; n = n.nextElementSibling) {
    if (!n.classList.contains('br')) n.classList.add('inphrase');
    if (n === last) break;
  }
  last.classList.add('phrase-last');
  return true;
}

/** The phrase a marked word is part of, or undefined when it is in none. */
export function phraseAt(el: HTMLElement, selector: string): PhrasePick | undefined {
  if (!el.classList.contains('inphrase') || !el.parentElement) return undefined;
  const words = Array.from(el.parentElement.querySelectorAll<HTMLElement>(`${selector}.inphrase`))
    .filter((w) => w.dataset.tok);
  const first = words[0];
  const last = words[words.length - 1];
  if (words.length < 2 || !first || !last) return undefined;
  const text = textFrom(first, last);
  if (text === null) return undefined;
  return { words: words.map((w) => JSON.parse(w.dataset.tok ?? '{}') as Token), text, last };
}

/**
 * Widen the selection to the whole words it touches. Shift-clicking a second
 * word extends the selection only to the point clicked, often one character
 * into it; the phrase looked up is whole words, and the highlight should say
 * so.
 */
export function selectWhole(root: ShadowRoot, first: HTMLElement, last: HTMLElement): void {
  const sel = (root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
  try {
    sel?.setBaseAndExtent(first, 0, last, last.childNodes.length);
  } catch {
    /* a selection the browser will not move: the phrase is still looked up whole */
  }
}

/**
 * The text from one word to another as it was written — the words'
 * surfaces and whatever sits between them, spaces included, but never the
 * readings drawn above them. Null when the two are not on one line.
 */
export function textFrom(first: HTMLElement, last: HTMLElement): string | null {
  if (first.parentNode !== last.parentNode) return null;
  let text = '';
  for (let n: Node | null = first; n; n = n.nextSibling) {
    if (n instanceof HTMLElement && n.dataset.tok) text += (JSON.parse(n.dataset.tok) as Token).surface ?? '';
    else if (!(n instanceof HTMLElement && n.classList.contains('br'))) text += n.textContent ?? '';
    if (n === last) return text;
  }
  return null;
}

/**
 * A selection on the overlay as text, the way it reads.
 *
 * The browser's own copy puts a line break after every word there — each is
 * a flex item, a box of its own — so a line pasted anywhere came out one word
 * to a line. This keeps the breaks the subtitle was written with and one
 * between the line and its translation, and leaves out the readings above
 * the words, as the browser does.
 */
export function plainText(range: Range): string {
  const frag = range.cloneContents();
  for (const n of frag.querySelectorAll('rt, rp')) n.remove();
  for (const n of frag.querySelectorAll('.br')) n.replaceWith('\n');
  for (const n of frag.querySelectorAll('.secondary')) n.before('\n');
  return (frag.textContent ?? '').replace(/^\n+|\n+$/g, '');
}

/**
 * A run of words as one token to look up: the last word in its dictionary
 * form, the rest as written — 気にした is looked up as 気にする, and falls
 * back to the text itself.
 */
export function phraseToken(words: Token[], text: string): Token {
  const first = words[0];
  const last = words[words.length - 1];
  const head = last && text.endsWith(last.surface) ? text.slice(0, text.length - last.surface.length) : null;
  const readings = words.map((w) => w.reading);
  return {
    surface: text,
    lemma: head !== null && last?.lemma ? head + last.lemma : text,
    start: first?.start ?? 0,
    end: last?.end ?? text.length,
    content: true,
    parts: words.map((w) => w.surface),
    // Readings written as spaced syllables, as pinyin is, stay spaced when joined.
    ...(readings.every(Boolean) && !/\s/.test(text)
      ? { reading: readings.join(readings.some((r) => /\s/.test(r ?? '')) ? ' ' : '') }
      : {}),
  };
}
