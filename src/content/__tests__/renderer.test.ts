import { afterEach, describe, expect, it, vi } from 'vitest';
import { zhRuby } from '../../morphology/chinese';
import { IntlSegmenter } from '../../morphology/intl';
import type { Token } from '../../morphology/types';
import { closePopup, showPopup } from '../popup';
import { Overlay } from '../renderer';

/**
 * The subtitle line as it is drawn: the space between two words, the marks
 * written against a word, and readings the way the language draws them.
 */

let overlay: Overlay | null = null;

function drawn(tokens: Token[], more: (o: Overlay, mount: HTMLElement) => void = () => {}): HTMLElement[] {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  overlay = new Overlay(mount);
  more(overlay, mount);
  overlay.render(tokens);
  const primary = mount.querySelector('.libregaku-root')!.shadowRoot!.querySelector('.primary')!;
  return Array.from(primary.children) as HTMLElement[];
}

const spanish = (text: string): Token[] => new IntlSegmenter('es').segment(text);
const classes = (els: HTMLElement[]): Array<[string | null, string]> => els.map((el) => [el.textContent, el.className]);

afterEach(() => {
  overlay?.destroy();
  overlay = null;
  document.body.replaceChildren();
});

describe('the space between words', () => {
  it('draws a space as a space, apart from the padding that keeps unspaced words apart', () => {
    const els = drawn(spanish('esto se había'));
    expect(classes(els)).toEqual([['esto', 't'], [' ', 'p sp'], ['se', 't'], [' ', 'p sp'], ['había', 't']]);
  });

  it('keeps a line with no spaces as it was', () => {
    const word = (surface: string, start: number): Token => ({ surface, start, end: start + surface.length, content: true });
    const els = drawn([word('学校', 0), word('に', 2), { surface: '。', start: 3, end: 4, punct: true }]);
    // Marks set in a square of their own carry their space with them.
    expect(classes(els)).toEqual([['学校', 't'], ['に', 't'], ['。', 'p']]);
  });
});

describe('punctuation', () => {
  it('stays against the word it is written against', () => {
    const els = drawn(spanish('ok, esto. ¿Sí? (no)'));
    expect(classes(els).filter(([, c]) => c !== 'p sp')).toEqual([
      ['ok', 't'], [',', 'p cl'], ['esto', 't'], ['.', 'p cl'],
      ['¿', 'p op'], ['Sí', 't'], ['?', 'p cl'], ['(', 'p op'], ['no', 't'], [')', 'p cl'],
    ]);
  });

  it('reads a quote by where it stands, and a hyphen inside a word as part of it', () => {
    const marks = (text: string) => classes(drawn(spanish(text))).filter(([t]) => !/\p{L}/u.test(t ?? '') && t !== ' ');
    expect(marks('dijo "hola" hoy')).toEqual([['"', 'p op'], ['"', 'p cl']]);
    expect(marks('fin."')).toEqual([['.', 'p cl'], ['"', 'p cl']]);
    expect(marks('niño-prodigio')).toEqual([['-', 'p cl op']]);
    // A dash that opens a line of speech keeps to the word after it.
    expect(marks('—Hola')).toEqual([['—', 'p op']]);
  });
});

describe('readings', () => {
  const word: Token = { surface: '学校', start: 0, end: 2, content: true, reading: 'xué xiào' };

  it('draws none until it is told how the language draws them', () => {
    const [el] = drawn([word]);
    expect(el?.querySelector('rt')).toBeNull();
    expect(el?.textContent).toBe('学校');
  });

  it('draws them the way it is given: a syllable over each character', () => {
    const [el] = drawn([word], (o) => o.setRuby((t) => zhRuby(t.surface, t.reading)));
    expect(Array.from(el!.querySelectorAll('ruby')).map((r) => [r.firstChild?.textContent, r.querySelector('rt')?.textContent]))
      .toEqual([['学', 'xué'], ['校', 'xiào']]);
  });

  it('marks a kana reading, so its character is given room as wide as the reading', () => {
    const verb: Token = { surface: '承りました', start: 0, end: 5, content: true, reading: 'うけたまわりました' };
    const [el] = drawn([verb], (o) => o.setRuby(() => [{ text: '承', ruby: 'うけたまわ' }, { text: 'りました' }]));
    const rubies = Array.from(el!.querySelectorAll<HTMLElement>('ruby'));
    expect(rubies.map((r) => [r.dataset.k, r.dataset.r])).toEqual([['うけたまわ', undefined]]);
  });

  it('keeps a romanised reading on its own mark', () => {
    const [el] = drawn([word], (o) => o.setRuby((t) => zhRuby(t.surface, t.reading)));
    const rubies = Array.from(el!.querySelectorAll<HTMLElement>('ruby'));
    expect(rubies.map((r) => [r.dataset.r, r.dataset.k])).toEqual([['xué', undefined], ['xiào', undefined]]);
  });
});

describe('the keyboard', () => {
  const words = (els: HTMLElement[]): HTMLElement[] => els.filter((el) => el.classList.contains('t'));
  const press = (el: Element, key: string): KeyboardEvent => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
    el.dispatchEvent(e);
    return e;
  };
  /** The element with focus, inside whatever shadow roots it is in. */
  const focused = (): Element | null => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  };
  /** Listen on the document, as the page and the extension's keys (index.ts) do, until the test ends. */
  const listening: Array<[string, EventListener, boolean]> = [];
  const listen = (type: string, fn: (e: KeyboardEvent) => void, capture = false): void => {
    document.addEventListener(type, fn as EventListener, capture);
    listening.push([type, fn as EventListener, capture]);
  };
  /** A word's card, opened as index.ts opens it. */
  const lookUp = (mount: HTMLElement) => (token: Token, el: HTMLElement): void =>
    showPopup(mount, el, { state: 'empty' }, {
      token, sentence: 'esto se había', status: 'unknown', onMark: () => {}, onAddCard: async () => 'added',
    });

  afterEach(() => {
    closePopup();
    for (const [type, fn, capture] of listening.splice(0)) document.removeEventListener(type, fn, capture);
  });

  it('names each word a button, with one of them in the tab order', () => {
    const line = words(drawn(spanish('esto se había')));
    expect(line.map((w) => w.getAttribute('role'))).toEqual(['button', 'button', 'button']);
    expect(line.map((w) => w.tabIndex)).toEqual([0, -1, -1]);
  });

  it('goes from word to word with ← and →, and keeps the arrows from the page', () => {
    const page = vi.fn();
    listen('keydown', page);
    const line = words(drawn(spanish('esto se había')));
    line[0]!.focus();
    expect(press(line[0]!, 'ArrowRight').defaultPrevented).toBe(true);
    expect(focused()).toBe(line[1]);
    // The word focused last is the one Tab comes back to.
    expect(line.map((w) => w.tabIndex)).toEqual([-1, 0, -1]);
    press(line[1]!, 'ArrowRight');
    press(line[2]!, 'ArrowRight');   // the last word stays the last
    expect(focused()).toBe(line[2]);
    press(line[2]!, 'ArrowLeft');
    expect(focused()).toBe(line[1]);
    expect(page).not.toHaveBeenCalled();
  });

  it('goes the other way along a line written right to left', () => {
    const line = words(drawn(new IntlSegmenter('ar').segment('مرحبا بك يا صديقي')));
    // As the browser finds it from the text, under dir=auto.
    line[0]!.parentElement!.style.direction = 'rtl';
    line[0]!.focus();
    press(line[0]!, 'ArrowLeft');
    expect(focused()).toBe(line[1]);
    press(line[1]!, 'ArrowRight');
    expect(focused()).toBe(line[0]);
  });

  it('opens a word on Enter or Space, focus goes into its card, and Escape gives it back to the word', () => {
    const page = vi.fn();
    listen('keydown', page);
    const opened: string[] = [];
    const line = words(drawn(spanish('esto se había'), (o, mount) => {
      mount.appendChild(document.createElement('aside'));   // the panel, after the line
      o.onToken((token, el) => {
        opened.push(token.surface);
        lookUp(mount)(token, el);
      });
    }));
    const se = line[1]!;
    se.focus();
    expect(press(se, 'Enter').defaultPrevented).toBe(true);
    expect(opened).toEqual(['se']);
    const card = document.querySelector<HTMLElement>('.libregaku-popup')!;
    // Next to the line in the page's order, so Tab from the word goes into it.
    expect(card.previousElementSibling).toBe(document.querySelector('.libregaku-root'));
    expect(focused()?.getAttribute('role')).toBe('dialog');

    // Escape closes the card, as the extension's own keys do (index.ts).
    listen('keydown', (e) => { if (e.key === 'Escape') closePopup(); }, true);
    press(focused()!, 'Escape');
    expect(document.querySelector('.libregaku-popup')).toBeNull();
    expect(focused()).toBe(se);

    // Space does what Enter does. Neither reached the page, where Space pauses the video.
    expect(press(se, ' ').defaultPrevented).toBe(true);
    expect(opened).toEqual(['se', 'se']);
    expect(page.mock.calls.map(([e]) => (e as KeyboardEvent).key)).not.toContain('Enter');
    expect(page.mock.calls.map(([e]) => (e as KeyboardEvent).key)).not.toContain(' ');
  });

  it('leaves focus where it is when a card opens as the pointer rests on a word', () => {
    const line = words(drawn(spanish('esto se había'), (o, mount) => o.onHover((token, el) => {
      if (token && el) lookUp(mount)(token, el);
    })));
    line[0]!.focus();
    line[2]!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(document.querySelector('.libregaku-popup')).not.toBeNull();
    expect(focused()).toBe(line[0]);
  });

  it('keeps focus in the line when the line changes, and after a gap with no line', () => {
    const line = words(drawn(spanish('esto se había')));
    line[1]!.focus();
    overlay!.render(spanish('otra vez'));
    expect(focused()?.textContent).toBe('otra');
    overlay!.clear();
    overlay!.render(spanish('y ya'));
    expect(focused()?.textContent).toBe('y');
  });

  it('takes no focus that no word had', () => {
    drawn(spanish('esto se había'));
    overlay!.render(spanish('otra vez'));
    expect(document.activeElement).toBe(document.body);
  });
});
