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
    ...(readings.every(Boolean) && !/\s/.test(text) ? { reading: readings.join('') } : {}),
  };
}
