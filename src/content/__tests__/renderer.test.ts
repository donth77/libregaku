import { afterEach, describe, expect, it } from 'vitest';
import { zhRuby } from '../../morphology/chinese';
import { IntlSegmenter } from '../../morphology/intl';
import type { Token } from '../../morphology/types';
import { Overlay } from '../renderer';

/**
 * The subtitle line as it is drawn: the space between two words, the marks
 * written against a word, and readings the way the language draws them.
 */

let overlay: Overlay | null = null;

function drawn(tokens: Token[], more: (o: Overlay) => void = () => {}): HTMLElement[] {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  overlay = new Overlay(mount);
  more(overlay);
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
});
