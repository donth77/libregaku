import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Token } from '../../morphology/types';
import { phraseToken, plainText, selectedWords, textFrom } from '../phrase';
import { Overlay } from '../renderer';

const tok = (surface: string, more: Partial<Token> = {}): Token => ({ surface, start: 0, end: surface.length, content: true, ...more });

/** A line as the overlay draws it: words with readings above, punctuation between. */
function line(parts: Array<Token | string>): { root: ShadowRoot; box: HTMLElement; words: HTMLElement[] } {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const box = document.createElement('div');
  for (const part of parts) {
    if (typeof part === 'string') {
      const p = document.createElement('span');
      p.className = 'p';
      p.textContent = part;
      box.appendChild(p);
      continue;
    }
    const w = document.createElement('span');
    w.className = 't';
    w.dataset.tok = JSON.stringify(part);
    w.textContent = part.surface;
    if (part.reading) {
      const rt = document.createElement('rt');
      rt.textContent = part.reading;
      w.appendChild(rt);
    }
    box.appendChild(w);
  }
  root.appendChild(box);
  document.body.appendChild(host);
  return { root, box, words: Array.from(box.querySelectorAll<HTMLElement>('.t')) };
}

/** The selection Chrome gives a shadow root, over these two nodes. */
function select(root: ShadowRoot, from: Node, to: Node): void {
  const range = document.createRange();
  range.setStart(from, 0);
  range.setEnd(to, to.childNodes.length);
  (root as unknown as { getSelection: () => unknown }).getSelection = () => ({
    isCollapsed: false, rangeCount: 1, getRangeAt: () => range,
  });
}

describe('phraseToken', () => {
  it('looks a phrase up with its last word in dictionary form', () => {
    const t = phraseToken(
      [tok('気', { reading: 'キ' }), tok('に', { reading: 'ニ' }), tok('した', { lemma: 'する', reading: 'シタ' })],
      '気にした',
    );
    expect(t).toMatchObject({ surface: '気にした', lemma: '気にする', reading: 'キニシタ', parts: ['気', 'に', 'した'] });
  });

  it('keeps the text as it is when the last word has no dictionary form', () => {
    expect(phraseToken([tok('ありがとう'), tok('ございます')], 'ありがとうございます').lemma).toBe('ありがとうございます');
  });

  it('keeps spaces between words, and does not run their readings together', () => {
    const t = phraseToken([tok('give', { reading: 'x' }), tok('up', { lemma: 'up', reading: 'y' })], 'give up');
    expect(t.lemma).toBe('give up');
    expect(t).not.toHaveProperty('reading');
  });
});

describe('textFrom', () => {
  it('takes the words as written and what lies between them, never the readings', () => {
    const { words } = line([tok('気', { reading: 'き' }), 'に', tok('しない'), '！']);
    expect(textFrom(words[0]!, words[1]!)).toBe('気にしない');
  });

  it('will not join words from two lines', () => {
    const a = line([tok('一')]).words[0]!;
    const b = line([tok('二')]).words[0]!;
    expect(textFrom(a, b)).toBeNull();
  });
});

describe('selectedWords', () => {
  it('finds every word a selection touches, even one it only clips', () => {
    const { root, box, words } = line([tok('気'), tok('に'), tok('する'), tok('な')]);
    select(root, words[0]!.firstChild!, words[2]!.firstChild!);
    expect(selectedWords(root, box, '.t').map((w) => w.textContent)).toEqual(['気', 'に', 'する']);
  });

  it('finds nothing without a selection', () => {
    const { root, box } = line([tok('気')]);
    expect(selectedWords(root, box, '.t')).toEqual([]);
  });
});

describe('a phrase on the overlay', () => {
  function overlay(): { o: Overlay; root: ShadowRoot; words: HTMLElement[] } {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const o = new Overlay(mount);
    o.render([
      tok('気', { start: 0, end: 1, reading: 'キ' }),
      tok('に', { start: 1, end: 2 }),
      tok('した', { start: 2, end: 4, lemma: 'する' }),
      { surface: '。', start: 4, end: 5, punct: true },
    ]);
    const root = mount.querySelector('.libregaku-root')!.shadowRoot!;
    return { o, root, words: Array.from(root.querySelectorAll<HTMLElement>('.t')) };
  }

  it('reports a selection across words as one phrase, and not the click that ends it as a word', () => {
    const { o, root, words } = overlay();
    const onPhrase = vi.fn();
    const onToken = vi.fn();
    o.onPhrase(onPhrase);
    o.onToken(onToken);
    select(root, words[0]!, words[2]!);
    words[2]!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    words[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onPhrase).toHaveBeenCalledOnce();
    const [toks, text, el] = onPhrase.mock.calls[0]!;
    expect((toks as Token[]).map((t) => t.surface)).toEqual(['気', 'に', 'した']);
    expect(text).toBe('気にした');
    expect(el).toBe(words[2]);
    expect(onToken).not.toHaveBeenCalled();
    // The next plain click is a word's again.
    (root as unknown as { getSelection: () => null }).getSelection = () => null;
    words[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToken).toHaveBeenCalledOnce();
  });

  it('leaves a click on one word alone, and stops hover while a selection is dragged', () => {
    const { o, root, words } = overlay();
    const onPhrase = vi.fn();
    const onHover = vi.fn();
    o.onPhrase(onPhrase);
    o.onHover(onHover);
    select(root, words[1]!.firstChild!, words[1]!.firstChild!);
    words[1]!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(onPhrase).not.toHaveBeenCalled();
    words[2]!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, buttons: 1 }));
    expect(onHover).not.toHaveBeenCalled();
    words[2]!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(onHover).toHaveBeenCalledOnce();
  });
});

describe('copying from the overlay', () => {
  const made: Overlay[] = [];
  afterEach(() => {
    for (const o of made.splice(0)) o.destroy();
    document.body.replaceChildren();
  });

  /** The overlay's own markup: words with readings, a break, and a translation. */
  function drawn(): { overlay: Overlay; root: ShadowRoot; wrap: HTMLElement } {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const overlay = new Overlay(mount);
    made.push(overlay);
    overlay.render([
      tok('外国', { reading: 'ガイコク' }), tok('に', { reading: 'ニ' }), tok('行きたい', { reading: 'イキタイ' }),
      { surface: '\n', start: -1, end: -1, punct: true }, tok('です', { reading: 'デス' }),
    ], 'I want to go abroad');
    const root = mount.querySelector('.libregaku-root')!.shadowRoot!;
    return { overlay, root, wrap: root.querySelector<HTMLElement>('.wrap')! };
  }

  it('reads the selection as text: no readings, and a break only where the line has one', () => {
    const { root, wrap } = drawn();
    const range = document.createRange();
    range.selectNodeContents(root.querySelector('.primary')!);
    expect(plainText(range)).toBe('外国に行きたい\nです');
    range.selectNodeContents(wrap);
    expect(plainText(range)).toBe('外国に行きたい\nです\nI want to go abroad');
  });

  it('puts that text on the clipboard when the selection is on the line', () => {
    const { overlay, root } = drawn();
    const words = Array.from(root.querySelectorAll('.t'));
    select(root, words[0]!, words[2]!);
    const data = new Map<string, string>();
    const e = new Event('copy', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(e, 'clipboardData', { value: { setData: (k: string, v: string) => data.set(k, v) } });
    document.dispatchEvent(e);
    expect(data.get('text/plain')).toBe('外国に行きたい');
    expect(e.defaultPrevented).toBe(true);

    // Gone with the overlay: the page's own copying is left alone.
    overlay.destroy();
    const after = new Event('copy', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(after, 'clipboardData', { value: { setData: () => {} } });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("leaves a selection that is not on the line to the page's own copy", () => {
    const { root } = drawn();
    const outside = document.createElement('p');
    outside.textContent = 'page text';
    document.body.appendChild(outside);
    select(root, outside, outside);
    const e = new Event('copy', { cancelable: true }) as ClipboardEvent;
    Object.defineProperty(e, 'clipboardData', { value: { setData: () => {} } });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});
