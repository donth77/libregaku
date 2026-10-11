import { afterEach, describe, expect, it } from 'vitest';
import { HELP, helpFor } from '../help/content';
import { inline, matches, renderHelp, terms } from '../help';

/**
 * The help page: everything it says comes from one file per language, set
 * out in chapters, and its search narrows the page — and its contents — as
 * you type.
 */

const en = HELP.en!;
const allTopics = en.chapters.flatMap((c) => c.topics);

function page(): { main: HTMLElement; toc: HTMLElement; input: HTMLInputElement; none: HTMLElement } {
  document.body.innerHTML = '<nav class="toc"></nav><input id="q"><p id="none" hidden></p><div id="out"></div>';
  const main = document.getElementById('out') as HTMLElement;
  const toc = document.querySelector('.toc') as HTMLElement;
  const input = document.getElementById('q') as HTMLInputElement;
  const none = document.getElementById('none') as HTMLElement;
  renderHelp(main, toc, input, none, helpFor('en'));
  return { main, toc, input, none };
}

const search = (input: HTMLInputElement, q: string): void => {
  input.value = q;
  input.dispatchEvent(new Event('input'));
};
const visible = (main: HTMLElement): string[] =>
  Array.from(main.querySelectorAll<HTMLElement>('.chapter:not([hidden]) .topic:not([hidden])')).map((t) => t.id);

afterEach(() => {
  document.body.replaceChildren();
});

describe('the help', () => {
  it('is written in English, and stands in for a language not written yet', () => {
    expect(helpFor('en-GB')).toBe(en);
    expect(helpFor('ja')).toBe(en);
    // Every topic and chapter can be linked to, and no two share an id.
    const ids = [...en.chapters.map((c) => c.id), ...allTopics.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
    // Popular links go somewhere.
    for (const id of en.popular.ids) expect(allTopics.some((t) => t.id === id), id).toBe(true);
  });

  it('sets the how-tos out in chapters, with the questions last, and lists the chapters', () => {
    const { main, toc } = page();
    const chapters = Array.from(main.querySelectorAll('.chapter-head h2')).map((h) => h.textContent);
    expect(chapters).toEqual(en.chapters.map((c) => c.title));
    expect(chapters.at(-1)).toBe('Questions');
    expect(Array.from(toc.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual(en.chapters.map((c) => `#${c.id}`));
    expect(main.querySelector('#add-card h3')?.textContent).toBe('Make a card#');
    // A question is folded until opened.
    expect(main.querySelector<HTMLDetailsElement>('details#q-track')?.open).toBe(false);
  });

  it('narrows to what a search finds, chapters and contents too, opening the questions it finds', () => {
    const { main, toc, input, none } = page();
    search(input, 'purple underline');
    expect(visible(main)).toEqual(['marks', 'q-track']);
    expect(main.querySelector<HTMLDetailsElement>('details#q-track')?.open).toBe(true);
    expect(Array.from(main.querySelectorAll('#q-track mark')).map((m) => m.textContent?.toLowerCase())).toEqual(
      expect.arrayContaining(['purple', 'underline']),
    );
    expect(Array.from(toc.querySelectorAll<HTMLElement>('a:not([hidden])')).map((a) => a.textContent)).toEqual([
      'Marking words', 'Questions',
    ]);
    expect(none.hidden).toBe(true);
    // Its own keywords count too: "watchlist" is nowhere in the text.
    search(input, 'watchlist');
    expect(visible(main)).toEqual(['tracked']);
  });

  it('says so when nothing matches, and comes back whole when the search is cleared', () => {
    const { main, input, none } = page();
    search(input, 'zzzz');
    expect(visible(main)).toEqual([]);
    expect(none.hidden).toBe(false);
    expect(none.textContent).toBe('Nothing here mentions “zzzz”.');
    search(input, '');
    expect(visible(main)).toHaveLength(allTopics.length);
    expect(none.hidden).toBe(true);
  });

  it('draws keys as keys, a setting as the path to it, and a tip apart', () => {
    const nodes = inline('Press `A`, or open {Settings → Anki → Picture}.', ['anki']);
    expect(nodes.find((n) => (n as HTMLElement).tagName === 'KBD')?.textContent).toBe('A');
    const path = nodes.find((n) => (n as HTMLElement).className === 'path') as HTMLElement;
    expect(Array.from(path.children).filter((c) => !c.classList.contains('sep')).map((c) => c.textContent))
      .toEqual(['Settings', 'Anki', 'Picture']);
    expect(path.querySelectorAll('.sep')).toHaveLength(2);
    expect(path.querySelector('mark')?.textContent).toBe('Anki');

    const { main } = page();
    expect(main.querySelector('#add-card .tip')?.textContent).toContain('Click Added within a few minutes');
    expect(main.querySelectorAll('#get-started .steps li')).toHaveLength(3);
    expect(matches(allTopics.find((t) => t.id === 'keys')!, terms('ESC'))).toBe(true);
  });
});
