import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../i18n/en';

/**
 * The first-run checklist's deck step. It used to tick as soon as any deck was
 * in settings — and the settings panel filled one in by itself, so the step
 * that asks a learner to choose where cards go was done before they looked.
 * Then it opened again whenever the deck changed, which is every time another
 * language is learned: "Get started", for someone long since started.
 */

// The panel itself is tested on its own; here it only needs a deck list that
// writes the setting when a person picks from it, as the real one does.
vi.mock('../content/settings-panel', () => {
  // Resolved when used, so it is the same settings module the page loaded.
  const setSetting = async (key: 'deck', value: string) => (await import('../settings')).setSetting(key, value);
  return {
    PANEL_STYLE: '',
    buildSettings: () => {
      const root = document.createElement('div');
      const deck = document.createElement('select');
      deck.name = 'deck';
      for (const name of ['Default', 'Vocabulary']) {
        const o = document.createElement('option');
        o.value = o.textContent = name;
        deck.appendChild(o);
      }
      deck.addEventListener('change', () => void setSetting('deck', deck.value));
      root.appendChild(deck);
      // Sections for the contents to list, as the real panel groups its settings.
      for (const [id, title] of [['lg-anki', 'Anki'], ['lg-cards', 'Cards'], ['lg-data', 'Data']]) {
        const section = document.createElement('section');
        section.className = 'grp-section';
        section.id = id!;
        const h = document.createElement('h2');
        h.className = 'grp';
        h.textContent = title!;
        section.appendChild(h);
        root.appendChild(section);
      }
      return root;
    },
  };
});

let sync: Record<string, unknown>;
let local: Record<string, unknown>;

/** The parts of options.html the script reaches for. */
const PAGE = `
  <section id="setup" hidden>
    <ol>
      <li id="step-lang"><span class="tick">○</span> Choose what you're learning</li>
      <li id="step-anki"><span class="tick">○</span> Connect Anki and pick a deck for new cards</li>
    </ol>
    <button id="confirmLang"></button>
    <button id="confirmDeck" hidden></button>
  </section>
  <nav class="toc"></nav>
  <section id="settings"></section>`;

async function open(settings: Record<string, unknown>, chosen?: string): Promise<void> {
  sync = { 'libregaku.settings': settings };
  local = chosen === undefined ? {} : { 'libregaku.deckChosen': chosen };
  document.body.innerHTML = PAGE;
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: async (k: string) => ({ [k]: sync[k] }),
        set: async (patch: Record<string, unknown>) => { Object.assign(sync, patch); },
      },
      local: {
        get: async (k: string) => ({ [k]: local[k] }),
        set: async (patch: Record<string, unknown>) => { Object.assign(local, patch); },
      },
      onChanged: { addListener: () => {} },
    },
    runtime: { getURL: (p: string) => `chrome-extension://self/${p}`, sendMessage: async () => undefined },
  });
  vi.resetModules();
  await import('../options');
  await vi.waitFor(() => {
    if (!document.querySelector('#settings select')) throw new Error('not mounted');
  });
}

const step = (): HTMLElement => document.getElementById('step-anki') as HTMLElement;
const keep = (): HTMLButtonElement => document.getElementById('confirmDeck') as HTMLButtonElement;
const setup = (): HTMLElement => document.getElementById('setup') as HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
});

describe('the contents', () => {
  const link = (name: string): HTMLAnchorElement =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a')).find((a) => a.textContent === name)!;
  const marked = (): string[] =>
    Array.from(document.querySelectorAll('.toc a[aria-current="true"]')).map((a) => a.textContent ?? '');
  const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

  it('works out the section being read from where the sections sit', async () => {
    await open({ configured: true, deck: 'Default' }, 'Default');
    const { readingIndex } = await import('../options');
    expect(readingIndex([-500, -100, 300, 900], 900, false)).toBe(2);
    expect(readingIndex([40, 700, 1600], 900, false)).toBe(0);
    // Scrolled as far as it goes: the last, though it never reached the line.
    expect(readingIndex([-900, 200, 520], 900, true)).toBe(2);
    expect(readingIndex([], 900, false)).toBe(-1);
  });

  it('marks a section picked from them at once, and keeps it until the page is moved by hand', async () => {
    await open({ configured: true, deck: 'Default' }, 'Default');
    // Anki at the top of the window; Cards and Data below the reading line, as at the foot of the page.
    const tops: Record<string, number> = { 'lg-anki': 0, 'lg-cards': 600, 'lg-data': 900 };
    for (const s of Array.from(document.querySelectorAll<HTMLElement>('.grp-section'))) {
      s.getBoundingClientRect = () => ({ top: tops[s.id] ?? 0 }) as DOMRect;
    }
    window.dispatchEvent(new Event('scroll'));
    await frame();
    expect(marked()).toEqual(['Anki']);

    link('Data').click();
    expect(marked()).toEqual(['Data']);
    expect(document.getElementById('lg-data')!.classList.contains('landed')).toBe(true);
    // The scroll the pick starts does not undo it.
    window.dispatchEvent(new Event('scroll'));
    await frame();
    expect(marked()).toEqual(['Data']);

    // Once that scroll is over, moving the page is the reader's doing.
    window.dispatchEvent(new Event('scrollend'));
    window.dispatchEvent(new Event('scroll'));
    await frame();
    expect(marked()).toEqual(['Anki']);
  });
});

describe('the deck step', () => {
  it('stays open for a deck nobody chose, and offers to keep it', async () => {
    await open({ configured: true, deck: 'Default' });
    expect(step().classList.contains('done')).toBe(false);
    expect(setup().hidden).toBe(false);
    expect(keep().hidden).toBe(false);
    expect(keep().textContent).toBe('Use Default for new cards');
  });

  it('ticks once the learner keeps the deck already set', async () => {
    await open({ configured: true, deck: 'Default' });
    keep().click();
    expect(step().classList.contains('done')).toBe(true);
    expect(setup().hidden).toBe(true);
    await vi.waitFor(() => expect(local['libregaku.deckChosen']).toBe('Default'));
  });

  it('ticks when the learner picks a deck from the list', async () => {
    await open({ configured: true, deck: '' });
    const sel = document.querySelector<HTMLSelectElement>('#settings select')!;
    sel.value = 'Vocabulary';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(step().classList.contains('done')).toBe(true));
  });

  it('stays done when another language is learned, which has decks of its own', async () => {
    await open({ configured: true, target: 'ja', deck: 'Default' }, 'Default');
    expect(setup().hidden).toBe(true);
    const { setSetting, settings } = await import('../settings');
    await setSetting('target', 'es');
    // Spanish has no deck chosen yet, and that is not a first run.
    expect(settings().deck).toBe('');
    expect(step().classList.contains('done')).toBe(true);
    expect(setup().hidden).toBe(true);
    expect(keep().hidden).toBe(true);
  });

  it('stays done when the deck is changed afterwards', async () => {
    await open({ configured: true, deck: 'Default' }, 'Default');
    const { setSetting } = await import('../settings');
    await setSetting('deck', 'Vocabulary');
    expect(step().classList.contains('done')).toBe(true);
    expect(setup().hidden).toBe(true);
  });

  it('offers the language’s own deck when none is set, and writes nothing for it', async () => {
    await open({ configured: true, target: 'ko', deck: '' });
    expect(step().classList.contains('done')).toBe(false);
    expect(keep().hidden).toBe(false);
    expect(keep().textContent).toBe('Use Libregaku-KO for new cards');
    keep().click();
    expect(step().classList.contains('done')).toBe(true);
    expect(setup().hidden).toBe(true);
    // Still no deck in settings: the language's own is made by its first card.
    const { settings } = await import('../settings');
    expect(settings().deck).toBe('');
    await vi.waitFor(() => expect(local['libregaku.deckChosen']).toBe('Libregaku-KO'));
  });
});

describe('a change of language', () => {
  it('redraws the page at once: the settings, their contents and the page', async () => {
    await open({ configured: true, deck: 'Default' }, 'Default');
    const before = document.querySelector('#settings > *');
    const deck = document.querySelector<HTMLSelectElement>('#settings select[name=deck]')!;
    deck.focus();

    const { setSetting } = await import('../settings');
    await setSetting('native', 'es');

    expect(document.documentElement.lang).toBe('es');
    // Built again, in place of the old.
    expect(document.querySelectorAll('#settings > *')).toHaveLength(1);
    expect(document.querySelector('#settings > *')).not.toBe(before);
    // The control in use is still the one in use.
    expect(document.activeElement).toBe(document.querySelector('#settings select[name=deck]'));
    expect(document.activeElement).not.toBe(deck);
    // The contents list each section once, and lead to the sections as rebuilt.
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
    expect(links.map((a) => a.textContent)).toEqual(['Anki', 'Cards', 'Data']);
    links[2]!.click();
    expect(document.getElementById('lg-data')!.classList.contains('landed')).toBe(true);
  });
});

/** A string in the English table by its "section.key" path, as data-i18n names it. */
function english(path: string): unknown {
  const [section = '', key = '', ...more] = path.split('.');
  return more.length ? undefined : (en as unknown as Record<string, Record<string, unknown> | undefined>)[section]?.[key];
}

/** Node's file reading. This project's types are the browser's, so it is described here. */
type Files = { readFileSync(path: string, encoding: 'utf8'): string };

describe.each(['options.html', 'action.html'])('the words in %s', (file) => {
  it('each name a string in the English table, and hold that English until it is read', async () => {
    const { readFileSync } = await vi.importActual<Files>('node:fs');
    // In a template the markup is only read: nothing it links to is fetched.
    const page = document.createElement('template');
    page.innerHTML = readFileSync(`src/${file}`, 'utf8');
    const found: Array<[path: string, markup: string]> = [];
    for (const el of Array.from(page.content.querySelectorAll('*'))) {
      const text = el.getAttribute('data-i18n');
      if (text) found.push([text, (el.textContent ?? '').replace(/\s+/g, ' ').trim()]);
      for (const attribute of ['title', 'aria-label', 'placeholder']) {
        const path = el.getAttribute(`data-i18n-${attribute}`);
        if (path) found.push([path, el.getAttribute(attribute) ?? '']);
      }
    }
    expect(found.length).toBeGreaterThan(5);
    for (const [path, markup] of found) {
      expect(typeof english(path), path).toBe('string');
      expect(markup, path).toBe(english(path));
    }
  });
});

describe('the language definitions are written in', () => {
  it('is your own language where the dictionary has it, and the one chosen for them where not', async () => {
    const { definitionLanguage, withDefaults } = await import('../settings');
    const of = (stored: Parameters<typeof withDefaults>[0]): string => definitionLanguage(withDefaults(stored));
    expect(of(undefined)).toBe('en');
    expect(of({ native: 'fr' })).toBe('fr');
    expect(of({ native: 'fr', definitions: 'de' })).toBe('fr');
    expect(of({ native: 'ko' })).toBe('en');
    expect(of({ native: 'ko', definitions: 'de' })).toBe('de');
    expect(of({ native: 'ko', definitions: 'xx' })).toBe('en');
  });

  it('keeps a chosen underline colour, and drops one that is not a colour', async () => {
    const { withDefaults } = await import('../settings');
    expect(withDefaults({ colorTracking: '#3366FF' }).colorTracking).toBe('#3366FF');
    expect(withDefaults({ colorTracking: 'red; background: url(x)' }).colorTracking).toBe('#a78bfa');
    expect(withDefaults({ colorKnown: '' }).colorKnown).toBe('#63af97');
  });
});
