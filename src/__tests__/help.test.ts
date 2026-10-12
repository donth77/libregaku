import { afterEach, describe, expect, it, vi } from 'vitest';
import { HELP_EN, helpFor } from '../help/content';
import { inline, matches, renderHelp, terms } from '../help';

/**
 * The help page: everything it says comes from one file per language, set
 * out in chapters, and its search narrows the page — and its contents — as
 * you type.
 */

const en = HELP_EN;
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
    expect(helpFor('hu')).toBe(en);
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
    expect(chapters.at(-1)).toBe('FAQ');
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
      'Marking words', 'FAQ',
    ]);
    expect(none.hidden).toBe(true);
    // Its own keywords count too: "watchlist" is nowhere in the text.
    search(input, 'watchlist');
    expect(visible(main)).toEqual(['tracked']);
  });

  it('finds a word whatever its accents, and marks it as written', () => {
    document.body.innerHTML = '<nav class="toc"></nav><input id="q"><p id="none" hidden></p><div id="out"></div>';
    const main = document.getElementById('out') as HTMLElement;
    const input = document.getElementById('q') as HTMLInputElement;
    renderHelp(main, document.querySelector('.toc'), input, document.getElementById('none') as HTMLElement, helpFor('es'));
    search(input, 'subtitulos');
    expect(visible(main).length).toBeGreaterThan(0);
    const marks = Array.from(main.querySelectorAll('.topic:not([hidden]) mark')).map((m) => m.textContent?.toLowerCase());
    expect(marks).toContain('subtítulos');
    // Kana voicing is part of the word: か does not find が.
    expect(inline('ガ', ['カ']).some((n) => n.nodeName === 'MARK')).toBe(false);
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

  // A span has no name to give, so aria-label="then" on the › was read as "›", or not at all.
  it('says "then" for each › in a path, and shows the › alone', () => {
    const path = inline('{Settings → Anki → Picture}', [], 'then')
      .find((n) => (n as HTMLElement).className === 'path') as HTMLElement;
    const seps = Array.from(path.querySelectorAll('.sep'));
    expect(seps).toHaveLength(2);
    for (const sep of seps) {
      expect(sep.hasAttribute('aria-label')).toBe(false);
      expect(sep.querySelector('[aria-hidden="true"]')?.textContent).toBe('›');
      expect(sep.querySelector('.vh')?.textContent).toBe(' then ');
    }
    // In the help's own language.
    const es = inline('{Ajustes → Anki}', [], 'luego').find((n) => (n as HTMLElement).className === 'path') as HTMLElement;
    expect(es.querySelector('.sep .vh')?.textContent).toBe(' luego ');
  });

  it('marks the chapter being read as the current one, and no other', () => {
    let report: (entries: Array<{ target: Element; isIntersecting: boolean }>) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof report) {
        report = callback;
      }
      observe(): void {}
      disconnect(): void {}
    });
    try {
      const { main, toc } = page();
      const chapters = Array.from(main.querySelectorAll('.chapter'));
      const links = Array.from(toc.querySelectorAll('a'));
      report([{ target: chapters[1]!, isIntersecting: true }]);
      expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(links.map((_, i) => (i === 1 ? 'true' : null)));
      report([{ target: chapters[1]!, isIntersecting: false }, { target: chapters[2]!, isIntersecting: true }]);
      expect(links[1]!.hasAttribute('aria-current')).toBe(false);
      expect(links[2]!.getAttribute('aria-current')).toBe('true');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('links a path that names a section of the settings to that section', () => {
    const link = inline('{Settings → Anki cards → Screenshot}', []).find((n) => (n as HTMLElement).className === 'path') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('options.html#lg-anki-cards');
    expect(link.textContent).toContain('Screenshot');
    const anki = inline('{Settings → Anki}', []).find((n) => (n as HTMLElement).className === 'path') as HTMLAnchorElement;
    expect(anki.getAttribute('href')).toBe('options.html#lg-anki');
    // One that names no section stays text.
    const plain = inline('{Settings → Nowhere → Thing}', []).find((n) => (n as HTMLElement).className === 'path') as HTMLElement;
    expect(plain.tagName).toBe('SPAN');
  });

  it('links a web address, in a new tab, shown without its https://', () => {
    const nodes = inline('Get Anki from https://apps.ankiweb.net.', ['anki']);
    const a = nodes.find((n) => (n as HTMLElement).tagName === 'A') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://apps.ankiweb.net');
    expect(a.target).toBe('_blank');
    expect(a.textContent).toBe('apps.ankiweb.net');
    expect(a.querySelector('mark')?.textContent).toBe('anki');
    // The full stop after it stays text, and so do the words of a language written without spaces.
    expect(nodes.at(-1)?.textContent).toBe('.');
    expect(inline('Ankiはhttps://apps.ankiweb.netから入手できます。', []).map((n) => n.textContent))
      .toEqual(['Ankiは', 'apps.ankiweb.net', 'から入手できます。']);

    const { main } = page();
    // Words that are a link, as written [words](https://…).
    const named = inline('with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed', []);
    expect(named.map((n) => n.textContent)).toEqual(['with ', 'AnkiConnect', ' installed']);
    expect((named[1] as HTMLAnchorElement).href).toBe('https://ankiweb.net/shared/info/2055492159');
    expect((named[1] as HTMLAnchorElement).target).toBe('_blank');
    // The add-on's page is linked where AnkiConnect is named, and the Anki download after it.
    const links = Array.from(main.querySelectorAll('#anki .body a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('https://apps.ankiweb.net');
    expect(links).toContain('https://ankiweb.net/shared/info/2055492159');
  });

  it('lays the keyboard shortcuts out as a table, a key and what it does on each row', () => {
    const { main } = page();
    const table = main.querySelector<HTMLTableElement>('#keys table')!;
    expect(Array.from(table.querySelectorAll('thead th')).map((c) => c.textContent)).toEqual(['Key', 'What it does']);
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    const cells = (r: HTMLTableRowElement): HTMLElement[] => Array.from(r.querySelectorAll('td'));
    expect(cells(rows[0]!)[0]!.querySelectorAll('kbd')).toHaveLength(2);   // ← →
    expect(rows.map(cells).find((c) => c[0]!.textContent === 'Esc')?.[1]?.textContent).toBe('Close the popup');
    // Searching reaches into the table.
    expect(matches(allTopics.find((t) => t.id === 'keys')!, terms('furigana'))).toBe(true);
  });
});
