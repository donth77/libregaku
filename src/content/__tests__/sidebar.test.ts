import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Following playback is the one piece of the panel with state that can go
 * quietly wrong: the transcript still renders, it just stops moving. These
 * pin down when it follows, when it stops, and what brings it back — and the
 * rest of what the panel owes the page it sits in: its keys, its listeners,
 * and a hover card that only ever describes the word under the pointer.
 */

const dict = vi.hoisted(() => ({
  /** Lookups waiting for an answer, so a test decides when each one lands. */
  pending: [] as Array<{ surface: string; answer: (word?: string) => void }>,
}));

vi.mock('../../dict/client', () => ({
  lookupToken: ({ surface }: { surface: string }) =>
    new Promise((resolve) => {
      dict.pending.push({
        surface,
        answer: (word = surface) => resolve({
          state: 'ok',
          entries: [{ id: '1', word, reading: 'よみ', common: false, senses: [{ pos: [], glosses: [`${word} meaning`] }] }],
        }),
      });
    }),
}));

const writes = vi.fn(async (_patch: Record<string, unknown>) => {});

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: writes },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { sendMessage: async () => ({}) },
});

import { Sidebar } from '../sidebar';
import type { SidebarDeps } from '../sidebar';
import { Transcript } from '../transcript';
import { closePopup, showPopup } from '../popup';
import { setSetting } from '../../settings';
import { furigana } from '../../morphology/furigana';
import type { Segmenter, Token } from '../../morphology/types';
import type { LookupResult } from '../../dict/client';

const flush = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LINES = ['a', 'b new', 'c', 'd'].map((text, i) => ({ start: i * 4, end: i * 4 + 3, text }));

/** Words split on spaces, with readings for the two that have kanji. */
const READINGS: Record<string, string> = { 食べる: 'たべる', 勉強: 'べんきょう' };
const segmenter: Segmenter = {
  tier: 2,
  hasLemma: true,
  ruby: furigana,
  segment: (text: string): Token[] => {
    let at = 0;
    return text.split(' ').map((surface) => {
      const start = text.indexOf(surface, at);
      at = start + surface.length;
      return { surface, start, end: at, lemma: surface, reading: READINGS[surface], content: true };
    });
  },
};

let scrollTo: ReturnType<typeof vi.fn>;
let scrollIntoView: ReturnType<typeof vi.fn>;
let seek: Mock<(t: number) => void>;
const sidebars: Sidebar[] = [];

async function build(overrides: Partial<SidebarDeps> = {}): Promise<{
  sidebar: Sidebar; root: ShadowRoot; list: HTMLElement; transcript: Transcript;
}> {
  const transcript = overrides.transcript ?? new Transcript();
  if (!overrides.transcript) transcript.setFull(LINES);
  seek = vi.fn<(t: number) => void>();
  const deps: SidebarDeps = {
    transcript,
    segmenter: () => null,
    measure: async (text) => ({ unknown: text.includes('new') ? 1 : 0, words: 2 }),
    statusOf: () => 'known',
    seek,
    currentTime: () => 0,
    onWordClick: () => {},
    context: () => ({ site: 'test', video: 'v', title: 't', url: 'u', lang: 'ja' }),
    ...overrides,
  };
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const sidebar = new Sidebar(mount, deps);
  sidebars.push(sidebar);
  await flush();                 // the async restore opens the panel
  sidebar.toggle(true);
  await flush();                 // per-line counts land
  const root = mount.querySelector('.libregaku-sidebar')!.shadowRoot!;
  const list = root.querySelector<HTMLElement>('.lines')!;
  scrollTo.mockClear();
  return { sidebar, root, list, transcript };
}

const filterButton = (root: ShadowRoot, label: string): HTMLElement =>
  Array.from(root.querySelectorAll<HTMLElement>('.filters .f')).find((b) => b.textContent === label)!;

/** Rows a filter leaves showing. Filtered rows are hidden in place, not removed. */
const shown = (root: ShadowRoot): NodeListOf<HTMLElement> => root.querySelectorAll('.line:not(.hide)');

beforeEach(() => {
  scrollTo = vi.fn();
  scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: scrollTo, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true });
  dict.pending.length = 0;
});

afterEach(async () => {
  sidebars.splice(0).forEach((sidebar) => sidebar.destroy());
  closePopup();
  document.body.replaceChildren();
  await setSetting('sidebarFollow', true);
  await setSetting('sidebarOpen', true);
  await setSetting('sidebarStats', true);
  await setSetting('sidebarHover', true);
  await setSetting('ruby', 'unknown');
  await setSetting('markKnown', false);
  await setSetting('underlines', true);
});

describe('tooltips in the panel', () => {
  it("labels its buttons with its own tooltips, quickly, and never the browser's slow one", async () => {
    const { root } = await build({ onAddLine: async () => {} });
    expect(root.querySelector('[title]')).toBeNull();
    // Icon buttons carry a tip; a button with words on it needs none.
    for (const sel of ['header .controls button', '.fab', '.line .save', '.line .addline', '.tab']) {
      const found = Array.from(root.querySelectorAll<HTMLElement>(sel));
      expect(found.length, sel).toBeGreaterThan(0);
      for (const b of found) expect(b.dataset.tip, sel).toBeTruthy();
    }
    expect(root.querySelector<HTMLElement>('.tab')?.dataset.key).toBe('S');

    const gear = root.querySelector<HTMLElement>('header button[aria-label="Settings"]')!;
    gear.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const tip = root.querySelector<HTMLElement>('.tip')!;
    expect(tip.classList.contains('on')).toBe(true);
    expect(tip.textContent).toBe('Settings');
  });
});

describe('picking a phrase in the transcript', () => {
  it('lets the line be selected, though the player it sits in turns selection off', async () => {
    const { root } = await build();
    // YouTube's player sets user-select: none, and the panel inherits it unless the text says otherwise.
    expect(root.querySelector('style')?.textContent).toMatch(/\.tx \{[^}]*user-select: text/);
  });
});

describe('the marked words', () => {
  type Mark = { word: string; status: 'tracking' | 'known' | 'ignored' | 'unknown' };
  const rows = (root: ShadowRoot): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('.trow'));
  const listed = (root: ShadowRoot): Array<string | null | undefined> =>
    rows(root).map((r) => r.querySelector('.tw')?.textContent);
  const chip = (root: ShadowRoot, show: string): HTMLButtonElement =>
    root.querySelector<HTMLButtonElement>(`.wchip[data-show="${show}"]`)!;

  it('lists the tracked ones first, and each can become a card or stop being tracked', async () => {
    const marks: Mark[] = [
      { word: '勉強', status: 'tracking' }, { word: '計画', status: 'tracking' }, { word: '田中', status: 'ignored' },
    ];
    const unmark = vi.fn(async (w: string) => { marks.splice(marks.findIndex((m) => m.word === w), 1); });
    const addWord = vi.fn(async (w: string) => `${w} · added to Vocabulary`);
    const { sidebar, root } = await build({ marked: () => [...marks], unmark, addWord });
    const button = root.querySelector<HTMLButtonElement>('[role=tab][data-mode="words"]')!;
    expect(button.textContent).toBe('Words3');
    button.click();
    expect(button.getAttribute('aria-selected')).toBe('true');
    expect(chip(root, 'tracking').getAttribute('aria-pressed')).toBe('true');
    expect(chip(root, 'tracking').textContent).toBe('Tracked2');
    expect(listed(root)).toEqual(['勉強', '計画']);
    expect(root.querySelector('.tintro')?.textContent).toBe("2 words you're tracking, underlined wherever they come up.");

    const [add, stop] = Array.from(rows(root)[0]!.querySelectorAll<HTMLButtonElement>('.btnrow button'));
    expect(stop!.textContent).toBe('Stop tracking');
    add!.click();
    await flush();
    expect(addWord).toHaveBeenCalledWith('勉強');
    expect(rows(root)[0]!.querySelector('.said')?.textContent).toBe('勉強 · added to Vocabulary');

    stop!.click();
    await flush();
    expect(unmark).toHaveBeenCalledWith('勉強');
    sidebar.refreshStatus();   // the mark came off: the list follows
    expect(listed(root)).toEqual(['計画']);
  });

  it('lists ignored and known words too, each with a way to take the mark off', async () => {
    const marks: Mark[] = [
      { word: '田中', status: 'ignored' }, { word: 'へえ', status: 'ignored' }, { word: '猫', status: 'known' },
      { word: '犬', status: 'unknown' },
    ];
    const unmark = vi.fn(async (w: string) => { marks.splice(marks.findIndex((m) => m.word === w), 1); });
    const { sidebar, root } = await build({ marked: () => [...marks], unmark, addWord: async () => '' });
    root.querySelector<HTMLButtonElement>('[role=tab][data-mode="words"]')!.click();

    chip(root, 'ignored').click();
    expect(chip(root, 'ignored').getAttribute('aria-pressed')).toBe('true');
    expect(listed(root)).toEqual(['田中', 'へえ']);
    expect(root.querySelector('.tintro')?.textContent).toBe('2 words never underlined or counted.');
    // No card from here: an ignored word is one you do not want.
    const buttons = Array.from(rows(root)[0]!.querySelectorAll<HTMLButtonElement>('.btnrow button'));
    expect(buttons.map((b) => b.textContent)).toEqual(['Stop ignoring']);
    buttons[0]!.click();
    await flush();
    expect(unmark).toHaveBeenCalledWith('田中');
    sidebar.refreshStatus();
    expect(listed(root)).toEqual(['へえ']);

    chip(root, 'known').click();
    expect(listed(root)).toEqual(['猫']);
    expect(rows(root)[0]!.querySelector('.btnrow button')?.textContent).toBe('Unmark known');
  });

  it('finds a word in the open list by the word, its reading or its meaning', async () => {
    const marks: Mark[] = [
      { word: '保つ', status: 'known' }, { word: '猫', status: 'known' }, { word: '犬', status: 'known' },
    ];
    const MEANINGS: Record<string, [string, string]> = {
      保つ: ['たもつ', 'to keep'], 猫: ['ねこ', 'cat'], 犬: ['いぬ', 'dog'],
    };
    const lookup = vi.fn(async (t: Token): Promise<LookupResult> => {
      const [reading, gloss] = MEANINGS[t.surface]!;
      return { state: 'ok', entries: [{ id: t.surface, word: t.surface, reading, common: true, senses: [{ pos: ['n'], glosses: [gloss] }] }] };
    });
    const { root } = await build({ marked: () => [...marks], unmark: async () => {}, lookup });
    root.querySelector<HTMLButtonElement>('[role=tab][data-mode="words"]')!.click();
    chip(root, 'known').click();
    const find = root.querySelector<HTMLInputElement>('.wfind')!;
    const search = async (q: string): Promise<void> => {
      find.value = q;
      find.dispatchEvent(new Event('input'));
      await flush();
      await flush();
    };

    await search('猫');
    expect(listed(root)).toEqual(['猫']);
    expect(root.querySelector('.tintro')?.textContent).toBe('1 of 3 words.');
    // Meanings come from the dictionary: the search looks them up, then looks again.
    await search('keep');
    expect(listed(root)).toEqual(['保つ']);
    await search('いぬ');
    expect(listed(root)).toEqual(['犬']);
    await search('horse');
    expect(root.querySelector('.wordsview .empty')?.textContent).toBe('No word in this list matches “horse”.');
    await search('');
    expect(listed(root)).toEqual(['保つ', '猫', '犬']);
  });

  it('copies the open list, with readings and meanings, as a file Anki imports', async () => {
    const marks: Mark[] = [{ word: '猫', status: 'tracking' }, { word: '犬', status: 'tracking' }];
    const lookup = async (t: Token): Promise<LookupResult> => ({
      state: 'ok',
      entries: [{ id: t.surface, word: t.surface, reading: t.surface === '猫' ? 'ねこ' : 'いぬ', common: true, senses: [{ pos: ['n'], glosses: [t.surface === '猫' ? 'cat' : 'dog'] }] }],
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { root } = await build({ marked: () => [...marks], unmark: async () => {}, addWord: async () => '', lookup });
    root.querySelector<HTMLButtonElement>('[role=tab][data-mode="words"]')!.click();
    const copy = Array.from(root.querySelectorAll<HTMLButtonElement>('.wbar button')).find((b) => b.textContent === 'Copy')!;
    copy.click();
    await flush();
    await flush();
    const text = writeText.mock.calls[0]?.[0] as string;
    expect(text.split('\n').slice(3)).toEqual(['猫\tねこ\tcat', '犬\tいぬ\tdog']);
    expect(root.querySelector('.wsaid')?.textContent).toBe('2 words copied.');
  });

  it('says what each list is for when it is empty, and has no tab without marks to show', async () => {
    let { root } = await build({ marked: () => [] });
    root.querySelector<HTMLButtonElement>('[role=tab][data-mode="words"]')!.click();
    expect(root.querySelector('.wordsview .empty')?.textContent).toContain('Settings, under Word popup');
    chip(root, 'ignored').click();
    expect(root.querySelector('.wordsview .empty')?.textContent).toContain('never underlined or counted');
    sidebars.splice(0).forEach((s) => s.destroy());
    document.body.replaceChildren();
    ({ root } = await build());
    expect(root.querySelector('[role=tab][data-mode="words"]')).toBeNull();
  });
});

describe('a line as a card', () => {
  it("makes a card of the row's line from its button, with the line's own times", async () => {
    let finish!: () => void;
    const onAddLine = vi.fn(() => new Promise<void>((r) => { finish = r; }));
    const transcript = new Transcript();
    transcript.setFull([{ start: 4, end: 7, text: '外国に行きたい', secondary: 'I want to go abroad' }]);
    const { root } = await build({ transcript, onAddLine });
    const row = root.querySelector<HTMLElement>('.line')!;
    const add = row.querySelector<HTMLButtonElement>('.addline')!;
    expect(add.getAttribute('aria-label')).toBe('Add the sentence to Anki');

    add.click();
    add.click();
    expect(add.classList.contains('busy')).toBe(true);
    finish();
    await flush();
    expect(onAddLine).toHaveBeenCalledOnce();
    expect(onAddLine).toHaveBeenCalledWith('外国に行きたい', { start: 4, end: 7, translation: 'I want to go abroad' });
    expect(add.classList.contains('busy')).toBe(false);
    // A button on the row, not the row: no seek, and the bookmark untouched.
    expect(seek).not.toHaveBeenCalled();
    expect(row.querySelector('.save')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('has no such button when nothing is there to make the card', async () => {
    const { root } = await build();
    expect(root.querySelector('.addline')).toBeNull();
    expect(root.querySelector('.line .save')).not.toBeNull();
  });
});

describe('Sidebar vocabulary counts', () => {
  it('updates counts, the summary, and the active i+1 filter after marking and unmarking a word', async () => {
    let unknown = 1;
    const { sidebar, root } = await build({
      measure: async (text) => ({ unknown: text.includes('new') ? unknown : 0, words: 2 }),
    });
    filterButton(root, 'Ready to learn').click();
    expect(shown(root)).toHaveLength(1);
    expect(sidebar.stats?.unknown).toBe(1);

    unknown = 0;
    sidebar.refreshAnalysis();
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    expect(root.querySelector('.summary')?.textContent).toContain('100% known');
    expect(shown(root)).toHaveLength(0);

    unknown = 1;
    sidebar.refreshAnalysis();
    await flush();
    expect(sidebar.stats?.i1).toBe(1);
    expect(shown(root)).toHaveLength(1);
    expect(root.querySelector('.line:not(.hide) .x')?.textContent).toBe('1 new');
  });

  it('discards old background measurements after a newer status change', async () => {
    const pending: Array<(counts: { unknown: number; words: number }) => void> = [];
    const { sidebar } = await build({
      measure: () => new Promise((resolve) => pending.push(resolve)),
    });
    const obsolete = pending.splice(0);
    sidebar.refreshAnalysis();
    pending.splice(0).forEach((resolve) => resolve({ unknown: 0, words: 2 }));
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });

    obsolete.forEach((resolve) => resolve({ unknown: 1, words: 2 }));
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
  });

  it('keeps counts attached to their lines when a backward seek inserts an earlier caption', async () => {
    const transcript = new Transcript();
    transcript.observe('a new word', 10);
    const { root } = await build({ transcript });
    transcript.observe('already familiar', 2);
    await flush();
    const rows = root.querySelectorAll('.line');
    expect(rows[0]?.querySelector('.x')?.textContent).toBe('');
    expect(rows[1]?.querySelector('.x')?.textContent).toBe('1 new');
  });

  it('drops measurements when the transcript is replaced or cleared', async () => {
    const { sidebar, transcript } = await build();
    transcript.setFull([{ start: 0, end: 2, text: 'familiar' }]);
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    transcript.clear();
    expect(sidebar.stats).toBeNull();
  });

  it('refreshes the header statistics while the transcript is closed', async () => {
    let unknown = 1;
    const { sidebar } = await build({ measure: async () => ({ unknown, words: 1 }) });
    const changed = vi.fn();
    sidebar.onSavedChange(changed);
    sidebar.toggle(false);
    unknown = 0;
    sidebar.refreshAnalysis();
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    expect(changed).toHaveBeenCalled();
  });

  it('drops a count filter when progress is switched off, rather than hiding every line', async () => {
    const { root } = await build();
    filterButton(root, 'Has new words').click();
    expect(shown(root)).toHaveLength(1);

    await setSetting('sidebarStats', false);
    expect(shown(root)).toHaveLength(LINES.length);
    expect(filterButton(root, 'All lines').getAttribute('aria-pressed')).toBe('true');
    expect(filterButton(root, 'Has new words').getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('.fab')!.classList.contains('on')).toBe(false);
  });
});

describe('Sidebar views', () => {
  it('leaves the saved view alone when a new caption arrives', async () => {
    const { sidebar, root } = await build();
    sidebar.setMode('saved');
    await flush();
    const note = root.querySelector<HTMLElement>('.note')!;
    const fab = root.querySelector<HTMLElement>('.fab')!;
    expect(note.style.display).toBe('none');
    expect(fab.style.display).toBe('none');

    sidebar.render();                       // what a new line triggers
    expect(note.style.display).toBe('none');
    expect(fab.style.display).toBe('none');
    expect(root.querySelector('.savedview')).not.toBeNull();

    sidebar.setMode('transcript');
    expect(fab.style.display).toBe('');
  });

  it('stops above the site\'s control bar when told how tall it is', async () => {
    const { sidebar, root } = await build();
    const host = root.host as HTMLElement;
    expect(root.querySelector('style')!.textContent).toContain('bottom: var(--lg-bottom, 0px) !important');
    sidebar.setBottomInset(48.4);
    expect(host.style.getPropertyValue('--lg-bottom')).toBe('48px');
    sidebar.setBottomInset(Number.NaN);
    expect(host.style.getPropertyValue('--lg-bottom')).toBe('0px');
  });

  it('opens and closes when the setting changes elsewhere, without writing it back', async () => {
    const { sidebar } = await build();
    await setSetting('sidebarOpen', false);
    expect(sidebar.isOpen).toBe(false);
    await setSetting('sidebarOpen', true);
    expect(sidebar.isOpen).toBe(true);

    writes.mockClear();
    sidebar.toggle(false);
    expect(sidebar.isOpen).toBe(false);
    // One write, from the toggle itself: the change it announces must not
    // come back round as a second toggle.
    expect(writes).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls[0]![0]['libregaku.settings']).toMatchObject({ sidebarOpen: false });
  });

  it('keeps an open settings view in step with changes made elsewhere', async () => {
    const { sidebar, root } = await build();
    sidebar.setMode('settings');
    const furigana = root.querySelector<HTMLSelectElement>('select[name=ruby]')!;
    expect(furigana.value).toBe('unknown');
    await setSetting('ruby', 'never');     // the top bar's furigana switch
    expect(furigana.value).toBe('never');
  });
});

describe('Sidebar following playback', () => {
  it('scrolls the list, and only the list, to the current line', async () => {
    const { sidebar, root } = await build();
    sidebar.setActive(2);
    expect(root.querySelector('.line.cur')?.getAttribute('data-i')).toBe('2');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps following after its own scroll', async () => {
    const { sidebar, list } = await build();
    sidebar.setActive(1);
    list.dispatchEvent(new Event('scroll'));
    sidebar.setActive(2);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('stops once the viewer scrolls', async () => {
    const { sidebar, list } = await build();
    sidebar.setActive(1);
    list.dispatchEvent(new Event('wheel'));
    sidebar.setActive(2);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('the current-line button brings it back', async () => {
    const { sidebar, root, list } = await build();
    list.dispatchEvent(new Event('wheel'));
    sidebar.setActive(1);
    expect(scrollTo).not.toHaveBeenCalled();
    root.querySelector<HTMLElement>('.now')!.click();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    sidebar.setActive(2);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('clicking a line seeks and resumes', async () => {
    const { sidebar, root, list } = await build();
    list.dispatchEvent(new Event('wheel'));
    root.querySelector<HTMLElement>('.line[data-i="3"]')!.click();
    expect(seek).toHaveBeenCalledWith(12);
    sidebar.setActive(3);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('never scrolls when the setting is off', async () => {
    await setSetting('sidebarFollow', false);
    const { sidebar, root } = await build();
    sidebar.setActive(2);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(root.querySelector('.line.cur')?.getAttribute('data-i')).toBe('2');
  });

  it('marks the right card when a filter hides rows', async () => {
    const { sidebar, root } = await build();
    filterButton(root, 'Has new words').click();
    expect(shown(root)).toHaveLength(1);
    sidebar.setActive(1);
    expect(root.querySelector('.line.cur')?.getAttribute('data-i')).toBe('1');
  });

  it('follows a transcript that builds as it plays, including a line arriving out of order', async () => {
    const transcript = new Transcript();
    const { sidebar, root } = await build({ transcript });
    const current = (): string | undefined => root.querySelector('.line.cur .tx')?.textContent ?? undefined;

    transcript.observe('first line', 10);
    sidebar.setActive(transcript.activeAt(10));
    expect(current()).toBe('first line');
    transcript.observe('second line', 20);
    sidebar.setActive(transcript.activeAt(20));
    expect(current()).toBe('second line');
    expect(scrollTo).toHaveBeenCalled();

    // A backward seek observes an earlier caption, which moves every index.
    transcript.observe('opening line', 2);
    sidebar.setActive(transcript.activeAt(20));
    expect(current()).toBe('second line');
    expect(root.querySelectorAll('.line.cur')).toHaveLength(1);
  });
});

describe('Sidebar search', () => {
  const type = (input: HTMLInputElement, value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const enter = (input: HTMLInputElement, shiftKey = false): void => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey }));
  };

  async function withCats(): Promise<{ sidebar: Sidebar; root: ShadowRoot; input: HTMLInputElement }> {
    const transcript = new Transcript();
    transcript.setFull(['one cat', 'a dog', 'two cats', 'a bird'].map((text, i) => ({ start: i * 4, end: i * 4 + 3, text })));
    const { sidebar, root } = await build({ transcript });
    return { sidebar, root, input: root.querySelector<HTMLInputElement>('.search input')! };
  }

  it('goes to the first match and steps through the rest with Enter', async () => {
    const { root, input } = await withCats();
    const at = (): string | null | undefined => root.querySelector('.line.hit-cur')?.getAttribute('data-i');
    const count = (): string | null | undefined => root.querySelector('.search .count')?.textContent;

    type(input, 'cat');
    expect(at()).toBe('0');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll('.line.hit')).toHaveLength(2);
    expect(count()).toBe('1 of 2');

    enter(input);
    expect(at()).toBe('2');
    expect(count()).toBe('2 of 2');
    enter(input);
    expect(at()).toBe('0');                 // wraps round
    enter(input, true);
    expect(at()).toBe('2');                 // and back again with Shift
    expect(scrollTo).toHaveBeenCalledTimes(4);
  });

  it('says when nothing matches, and clears with Escape', async () => {
    const { root, input } = await withCats();
    type(input, 'fish');
    expect(root.querySelector('.search .count')?.textContent).toBe('No matches');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(input.value).toBe('');
    expect(root.querySelector('.search .count')?.textContent).toBe('');
    expect(root.querySelectorAll('.line.hit')).toHaveLength(0);
  });

  it("finds a word from its card in every form, opening the panel on the transcript", async () => {
    const transcript = new Transcript();
    transcript.setFull(['食べる', '食べた', 'ご飯', '食べない'].map((text, i) => ({ start: i * 4, end: i * 4 + 3, text })));
    const { sidebar, root } = await build({ transcript });
    sidebar.setMode('settings');
    sidebar.toggle(false);
    const hits = (): Array<string | null> => Array.from(root.querySelectorAll('.line.hit')).map((r) => r.getAttribute('data-i'));

    sidebar.findWord('食べる', ['食べた', '食べない']);
    expect(sidebar.isOpen).toBe(true);
    expect(sidebar.mode).toBe('transcript');
    const input = root.querySelector<HTMLInputElement>('.search input')!;
    expect(input.value).toBe('食べる');
    expect(hits()).toEqual(['0', '1', '3']);
    expect(root.querySelector('.line.hit-cur')?.getAttribute('data-i')).toBe('0');

    // Typed, the box is plain text again: 食べる as written.
    type(input, '食べる');
    expect(hits()).toEqual(['0']);
  });

  it('pauses following while a search is showing, and resumes once it is cleared', async () => {
    const { sidebar, input } = await withCats();
    type(input, 'dog');
    scrollTo.mockClear();
    sidebar.setActive(3);
    expect(scrollTo).not.toHaveBeenCalled();

    type(input, '');
    expect(scrollTo).toHaveBeenCalledTimes(1);   // straight back to the line being spoken
    sidebar.setActive(2);
    expect(scrollTo).toHaveBeenCalledTimes(2);   // and following again
  });
});

describe('Sidebar keys and focus', () => {
  const press = (el: Element, key: string): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
  };

  it('keeps a key from the page only when the control it was pressed in uses it', async () => {
    const { root } = await build();
    const heard: string[] = [];
    const onKey = (e: KeyboardEvent): void => { heard.push(e.key); };
    document.addEventListener('keydown', onKey);
    try {
      press(root.querySelector('.search input')!, 'k');   // typing a search
      const fab = root.querySelector('.fab')!;
      press(fab, ' ');                                     // pressing a focused button
      press(fab, 'k');                                     // a player shortcut
      press(fab, 'ArrowRight');
    } finally {
      document.removeEventListener('keydown', onKey);
    }
    expect(heard).toEqual(['k', 'ArrowRight']);
  });

  it('never lets a clicked button keep focus', async () => {
    const { root } = await build();
    const down = (el: Element): boolean => {
      const e = new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(down(root.querySelector('.fab')!)).toBe(true);
    expect(down(root.querySelector('.fab svg')!)).toBe(true);
    expect(down(root.querySelector('.line .save')!)).toBe(true);
    expect(down(root.querySelector('.search input')!)).toBe(false);
  });

  it('closes the filter menu on Escape and on a click elsewhere in the panel', async () => {
    const { root } = await build();
    const fab = root.querySelector<HTMLElement>('.fab')!;
    const menu = root.querySelector('.filters')!;
    fab.click();
    expect(menu.classList.contains('open')).toBe(true);
    press(fab, 'Escape');
    expect(menu.classList.contains('open')).toBe(false);
    expect(fab.getAttribute('aria-expanded')).toBe('false');

    fab.click();
    root.querySelector<HTMLElement>('.summary')!.click();
    expect(menu.classList.contains('open')).toBe(false);
  });

  it('stops listening to the page once destroyed', async () => {
    const { sidebar, root } = await build();
    const host = root.host as HTMLElement;
    sidebar.destroy();
    host.classList.remove('active');
    document.dispatchEvent(new MouseEvent('mousemove'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(host.classList.contains('active')).toBe(false);
    // Nor does it answer settings any more.
    await setSetting('ruby', 'never');
    expect(root.querySelector('.lines')!.classList.contains('ruby-off')).toBe(false);
  });

  it('adds nothing to the page when destroyed before it finished restoring', async () => {
    const added = vi.spyOn(document, 'addEventListener');
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const sidebar = new Sidebar(mount, {
      transcript: new Transcript(),
      segmenter: () => null,
      measure: async () => ({ unknown: 0, words: 0 }),
      statusOf: () => 'known',
      seek: () => {},
      currentTime: () => 0,
      onWordClick: () => {},
      context: () => ({ site: 'test', video: 'v', title: 't', url: 'u', lang: 'ja' }),
    });
    sidebar.destroy();
    await flush();
    expect(added).not.toHaveBeenCalled();
    added.mockRestore();
  });
});

describe('Sidebar readings and marks', () => {
  it('reserves room for readings only where a new word carries one', async () => {
    const transcript = new Transcript();
    transcript.setFull([{ start: 0, end: 3, text: '食べる 勉強' }, { start: 4, end: 7, text: '勉強 です' }]);
    const { root } = await build({
      transcript,
      segmenter: () => segmenter,
      statusOf: (t) => (t.surface === '食べる' ? 'unknown' : 'known'),
    });
    const [first, second] = Array.from(root.querySelectorAll('.tx'));
    expect(first!.classList.contains('has-ruby')).toBe(true);
    expect(first!.classList.contains('has-new-ruby')).toBe(true);
    // 勉強 has a reading, but it is known: in the default mode nothing shows.
    expect(second!.classList.contains('has-ruby')).toBe(true);
    expect(second!.classList.contains('has-new-ruby')).toBe(false);
    expect(root.querySelector('.w[data-s="known"] rt')?.textContent).toBe('べんきょう');
    const css = root.querySelector('style')!.textContent!;
    expect(css).toContain('.lines:not(.ruby-all) .w:not([data-s="unknown"]):not([data-s="learning"]) rt { visibility: hidden; }');
    expect(css).toContain('.lines.ruby-off rt { display: none; }');
  });

  it('follows the furigana and known-word settings as they change', async () => {
    const { list } = await build();
    expect(list.classList.contains('ruby-all')).toBe(false);
    expect(list.classList.contains('ruby-off')).toBe(false);

    await setSetting('ruby', 'never');
    expect(list.classList.contains('ruby-off')).toBe(true);
    await setSetting('ruby', 'always');
    expect(list.classList.contains('ruby-off')).toBe(false);
    expect(list.classList.contains('ruby-all')).toBe(true);

    await setSetting('markKnown', true);
    expect(list.classList.contains('mark-known')).toBe(true);
    await setSetting('markKnown', false);
    expect(list.classList.contains('mark-known')).toBe(false);

    // Every underline at once, in the transcript and the saved lists: on the panel, which holds both.
    const panel = list.closest('.panel')!;
    expect(panel.classList.contains('no-underlines')).toBe(false);
    await setSetting('underlines', false);
    expect(panel.classList.contains('no-underlines')).toBe(true);
    await setSetting('underlines', true);
    expect(panel.classList.contains('no-underlines')).toBe(false);
  });
});

describe('Sidebar word clicks', () => {
  it('sends the line\'s own start and translation with the word', async () => {
    const onWordClick = vi.fn();
    const transcript = new Transcript();
    transcript.setFull([
      { start: 0, end: 3, text: '勉強' },
      { start: 8, end: 11, text: '食べる', secondary: 'eat' },
    ]);
    const { root } = await build({ transcript, onWordClick, segmenter: () => segmenter });
    root.querySelector<HTMLElement>('.line[data-i="1"] .w')!.click();
    expect(onWordClick).toHaveBeenCalledWith(
      expect.objectContaining({ surface: '食べる' }),
      expect.anything(),
      '食べる',
      { start: 8, end: 11, translation: 'eat' },
    );
    expect(seek).not.toHaveBeenCalled();
  });
});

describe('Sidebar hover card', () => {
  async function withWords(): Promise<{ sidebar: Sidebar; root: ShadowRoot; words: HTMLElement[]; card: HTMLElement }> {
    const transcript = new Transcript();
    transcript.setFull([{ start: 0, end: 3, text: '食べる 勉強' }]);
    const { sidebar, root } = await build({ transcript, segmenter: () => segmenter, statusOf: () => 'unknown' });
    return {
      sidebar,
      root,
      words: Array.from(root.querySelectorAll<HTMLElement>('.w')),
      card: root.querySelector<HTMLElement>('.hover')!,
    };
  }
  const enter = (el: Element, from: Element | null = null): void => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: from }));
  };
  const leave = (el: Element, to: Element | null = null): void => {
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: to }));
  };
  const rect = (left: number, top: number): DOMRect =>
    ({ left, top, right: left + 40, bottom: top + 30, width: 40, height: 30, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

  it('shows the word under the pointer after a short wait', async () => {
    const { words, card } = await withWords();
    enter(words[0]!);
    await wait(200);
    expect(dict.pending.map((p) => p.surface)).toEqual(['食べる']);
    dict.pending[0]!.answer();
    await flush();
    expect(card.classList.contains('on')).toBe(true);
    expect(card.querySelector('.hw')?.textContent).toBe('食べる');
  });

  it('shows nothing when the lookup answers after the pointer has left', async () => {
    const { root, words, card } = await withWords();
    enter(words[0]!);
    await wait(200);
    leave(words[0]!, root.querySelector('.lines'));
    dict.pending[0]!.answer();
    await flush();
    expect(card.classList.contains('on')).toBe(false);
  });

  it('never shows an earlier word\'s answer over a later one', async () => {
    const { words, card } = await withWords();
    enter(words[0]!);
    await wait(200);
    leave(words[0]!, words[1]!);
    enter(words[1]!, words[0]!);
    await wait(200);
    dict.pending[1]!.answer();
    await flush();
    dict.pending[0]!.answer();              // the slow first lookup lands last
    await flush();
    expect(card.querySelector('.hw')?.textContent).toBe('勉強');
  });

  it('stays up while the pointer crosses a reading inside the same word', async () => {
    const { words, card } = await withWords();
    enter(words[0]!);
    await wait(200);
    dict.pending[0]!.answer();
    await flush();
    const ruby = words[0]!.querySelector('ruby')!;
    leave(words[0]!, ruby);
    enter(ruby, words[0]!);
    await wait(200);
    expect(card.classList.contains('on')).toBe(true);
    expect(dict.pending).toHaveLength(1);
  });

  it('goes away with the panel', async () => {
    const { sidebar, words, card } = await withWords();
    enter(words[0]!);
    await wait(200);
    dict.pending[0]!.answer();
    await flush();
    sidebar.toggle(false);
    expect(card.classList.contains('on')).toBe(false);
  });

  it('keeps the whole card on screen at the right edge, by its measured width', async () => {
    const { words, card } = await withWords();
    Object.defineProperty(card, 'offsetWidth', { configurable: true, get: () => 298 });
    words[0]!.getBoundingClientRect = () => rect(window.innerWidth - 60, 100);
    enter(words[0]!);
    await wait(200);
    dict.pending[0]!.answer();
    await flush();
    expect(card.style.left).toBe(`${window.innerWidth - 298 - 8}px`);

    words[1]!.getBoundingClientRect = () => rect(120, 100);
    leave(words[0]!, words[1]!);
    enter(words[1]!, words[0]!);
    await wait(200);
    dict.pending[1]!.answer();
    await flush();
    expect(card.style.left).toBe('120px');
  });

  it('stays out of the way of a card opened on purpose', async () => {
    const { root, words } = await withWords();
    showPopup(document.body, words[1]!, { state: 'empty' }, {
      token: { surface: '勉強', start: 0, end: 2 },
      sentence: '勉強',
      status: 'unknown',
      onMark: () => {},
      onAddCard: async () => 'added',
    });
    enter(words[0]!);
    await wait(200);
    expect(dict.pending).toHaveLength(0);
    expect(root.querySelector('.hover')!.classList.contains('on')).toBe(false);
  });
});

/*
 * A whole film. These pin the panel's cost to what is on screen: every line
 * gets a row, but words, readings and buttons only near the screen; each line
 * is analysed once per analysis however many parts of the panel want it; the
 * counter keeps only a few requests open; and a status change repaints rows
 * where they stand instead of building them again.
 *
 * Thousands of rows in a simulated DOM take well under a second alone but can
 * pass the default five when the whole suite shares a busy machine, hence the
 * longer limit. The assertions are about what gets built, not how fast.
 */
describe('Sidebar at the length of a film', { timeout: 30_000 }, () => {
  /** Visibility, reported when the test says so rather than by layout. */
  class FakeIO {
    static current: FakeIO | null = null;
    readonly targets = new Set<Element>();
    constructor(readonly callback: IntersectionObserverCallback, readonly options?: IntersectionObserverInit) {
      FakeIO.current = this;
    }
    observe(el: Element): void { this.targets.add(el); }
    unobserve(el: Element): void { this.targets.delete(el); }
    disconnect(): void { this.targets.clear(); }
    takeRecords(): IntersectionObserverEntry[] { return []; }
    report(els: Element[], near: boolean): void {
      this.callback(
        els.map((target) => ({ target, isIntersecting: near }) as unknown as IntersectionObserverEntry),
        this as unknown as IntersectionObserver,
      );
    }
  }

  const realIO = globalThis.IntersectionObserver;
  beforeEach(() => {
    FakeIO.current = null;
    vi.stubGlobal('IntersectionObserver', FakeIO);
  });
  afterEach(() => {
    vi.stubGlobal('IntersectionObserver', realIO);
  });

  const LENGTH = 3000;
  const film = (n = LENGTH): Transcript => {
    const t = new Transcript();
    t.setFull(Array.from({ length: n }, (_, i) => ({ start: i * 4, end: i * 4 + 3, text: `line ${i} w${i}` })));
    return t;
  };

  /** The words analyser, counting what it is asked for. */
  function counted(): Segmenter & { calls: Map<string, number>; total: () => number } {
    const calls = new Map<string, number>();
    return {
      tier: 2,
      hasLemma: true,
      ruby: furigana,
      calls,
      total: () => [...calls.values()].reduce((a, b) => a + b, 0),
      segment(text: string): Token[] {
        calls.set(text, (calls.get(text) ?? 0) + 1);
        return segmenter.segment(text) as Token[];
      },
    };
  }

  /**
   * An analyser that answers only when the test lets it — the offscreen
   * document, slowed down enough to see how much is asked of it at once.
   */
  function queued(): {
    seg: Segmenter; calls: Map<string, number>; waiting: Array<() => void>;
    most: () => number; drain: () => Promise<void>;
  } {
    const calls = new Map<string, number>();
    const waiting: Array<() => void> = [];
    let most = 0;
    return {
      calls,
      waiting,
      most: () => most,
      seg: {
        tier: 2,
        hasLemma: true,
        ruby: furigana,
        segment(text: string): Promise<Token[]> {
          calls.set(text, (calls.get(text) ?? 0) + 1);
          return new Promise((resolve) => {
            waiting.push(() => resolve(segmenter.segment(text) as Token[]));
            most = Math.max(most, waiting.length);
          });
        },
      },
      async drain(): Promise<void> {
        for (let round = 0; round < 20000; round++) {
          if (!waiting.length) {
            await flush();
            if (!waiting.length) return;
          }
          waiting.splice(0).forEach((answer) => answer());
          for (let tick = 0; tick < 6; tick++) await Promise.resolve();
        }
      },
    };
  }

  const builtRows = (root: ShadowRoot): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('.line')).filter((row) => row.querySelector('.w'));
  const blocks = (root: ShadowRoot, from: number, to: number): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>('.blk')).slice(from, to);

  async function counts(sidebar: Sidebar): Promise<void> {
    for (let i = 0; i < 400 && !sidebar.stats; i++) await flush();
  }

  /** Building is sliced across frames; wait until these rows have their words. */
  async function builtBy(rows: Element[]): Promise<void> {
    for (let i = 0; i < 100 && rows.some((row) => !row.querySelector('.w')); i++) await wait(16);
  }

  /** Rows are made block by block in the background; wait until there are this many. */
  async function rowsBy(root: ShadowRoot, n: number): Promise<void> {
    for (let i = 0; i < 400 && root.querySelectorAll('.line').length < n; i++) await flush();
  }

  /** Mount and open at once, as the player does, and look before any timer has run. */
  function openNow(overrides: Partial<SidebarDeps> = {}): { sidebar: Sidebar; root: ShadowRoot } {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const sidebar = new Sidebar(mount, {
      transcript: film(),
      segmenter: () => null,
      measure: async () => ({ unknown: 0, words: 1 }),
      statusOf: () => 'known',
      seek,
      currentTime: () => 0,
      onWordClick: () => {},
      context: () => ({ site: 'test', video: 'v', title: 't', url: 'u', lang: 'ja' }),
      ...overrides,
    });
    sidebars.push(sidebar);
    sidebar.toggle(true);
    return { sidebar, root: mount.querySelector('.libregaku-sidebar')!.shadowRoot! };
  }

  it('opens with every block but rows only near the screen, and makes the rest in the background', async () => {
    await setSetting('sidebarStats', false);   // rendering alone, no counting
    seek = vi.fn<(t: number) => void>();
    const seg = counted();
    const { root } = openNow({ segmenter: () => seg });
    const io = FakeIO.current!;

    // Opening: every block, sized and empty, and rows for the first few only.
    expect(root.querySelectorAll('.blk')).toHaveLength(LENGTH / 10);
    expect(root.querySelectorAll('.line').length).toBeLessThanOrEqual(30);
    expect(builtRows(root).length).toBeGreaterThan(0);
    expect(builtRows(root).length).toBeLessThanOrEqual(24);
    expect(seg.total()).toBeLessThanOrEqual(24);
    // Watched block by block from the list itself, a screen's height either side.
    expect(io.targets.size).toBe(LENGTH / 10);
    expect(io.options?.root).toBe(root.querySelector('.lines'));
    expect(io.options?.rootMargin).toBe('100% 0px');

    // The rest are made a slice at a time, and ask the analyser for nothing.
    await flush();
    expect(root.querySelectorAll('.line').length).toBeLessThan(LENGTH);
    await rowsBy(root, LENGTH);
    expect(root.querySelectorAll('.line')).toHaveLength(LENGTH);
    expect(Array.from(root.querySelectorAll<HTMLElement>('.line')).map((r) => r.dataset.i))
      .toEqual(Array.from({ length: LENGTH }, (_, i) => String(i)));
    expect(builtRows(root).length).toBeLessThanOrEqual(24);
    expect(seg.total()).toBeLessThanOrEqual(24);

    // Scrolled deep: the blocks that come near are built, and only those.
    io.report(blocks(root, 150, 153), true);
    await builtBy(blocks(root, 150, 153).flatMap((b) => Array.from(b.children)));
    expect(builtRows(root).length).toBeLessThanOrEqual(60);
    expect(seg.total()).toBeLessThanOrEqual(60);
    for (const row of blocks(root, 150, 153).flatMap((b) => Array.from(b.children))) {
      expect(row.querySelector('.w')).not.toBeNull();
      expect(row.querySelector('.save')).not.toBeNull();
    }

    // Blocks passed on the way are dropped before their turn; nothing asked twice.
    const asked = seg.total();
    io.report(blocks(root, 150, 153), false);
    io.report(blocks(root, 150, 153), true);
    expect(seg.total()).toBe(asked);
    expect([...seg.calls.values()].every((n) => n === 1)).toBe(true);
  });

  it('counts every line exactly once per analysis, a few requests at a time', async () => {
    const q = queued();
    const { sidebar, root } = await build({ transcript: film(), segmenter: () => q.seg });

    // Nothing counted yet: no numbers, and a neutral word instead of wrong ones.
    expect(sidebar.stats).toBeNull();
    expect(root.querySelector('.summary')?.textContent).toMatch(/^Counting new words/);
    expect(q.waiting.length).toBeLessThanOrEqual(40);

    await q.drain();
    expect(q.calls.size).toBe(LENGTH);
    expect([...q.calls.values()].every((n) => n === 1)).toBe(true);
    // The rows being read and a handful for counting — never the whole film.
    expect(q.most()).toBeLessThanOrEqual(24 + 8);
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    expect(root.querySelector('.summary')?.textContent).toContain('100% known');

    // A status change counts again from tokens in hand: no requests at all.
    sidebar.refreshStatus();
    expect(q.waiting).toHaveLength(0);
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });

    // A new analysis asks for every line once more, and once only.
    sidebar.refreshAnalysis();
    expect(sidebar.stats).toBeNull();
    await q.drain();
    expect([...q.calls.values()].every((n) => n === 2)).toBe(true);
    expect(q.most()).toBeLessThanOrEqual(24 + 8);
    expect(sidebar.stats).not.toBeNull();
  });

  it('keeps a count filter waiting for the counts instead of showing a partial list', async () => {
    const q = queued();
    const { root } = await build({
      transcript: film(300),
      segmenter: () => q.seg,
      statusOf: (t) => (t.surface.startsWith('w1') ? 'unknown' : 'known'),
    });
    filterButton(root, 'Has new words').click();
    const wait = root.querySelector<HTMLElement>('.wait')!;
    expect(shown(root)).toHaveLength(0);
    expect(wait.hidden).toBe(false);
    expect(wait.textContent).toMatch(/^Counting new words/);

    await q.drain();
    await rowsBy(root, 300);
    expect(wait.hidden).toBe(true);
    // w1, w10–w19, w100–w199: the lines with a word marked unknown.
    expect(shown(root)).toHaveLength(1 + 10 + 100);
  });

  it('goes to a match or a line anywhere in the film, building it on arrival', async () => {
    const seg = counted();
    const { sidebar, root } = await build({ transcript: film(), segmenter: () => seg });
    const input = root.querySelector<HTMLInputElement>('.search input')!;

    input.value = 'w2500';
    input.dispatchEvent(new Event('input'));
    const hit = root.querySelector<HTMLElement>('.line.hit-cur')!;
    expect(hit.dataset.i).toBe('2500');
    expect(root.querySelector('.search .count')?.textContent).toBe('1 of 1');
    expect(scrollTo).toHaveBeenCalled();
    await builtBy([hit]);
    expect(hit.querySelector('.w')).not.toBeNull();

    await rowsBy(root, LENGTH);
    root.querySelector<HTMLElement>('.line[data-i="2900"]')!.click();
    expect(seek).toHaveBeenCalledWith(2900 * 4);

    input.value = '';
    input.dispatchEvent(new Event('input'));
    scrollTo.mockClear();
    sidebar.setActive(1200);
    const cur = root.querySelector<HTMLElement>('.line.cur')!;
    expect(cur.dataset.i).toBe('1200');
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await builtBy([cur]);
    expect(cur.querySelector('.w')).not.toBeNull();
  });

  it('repaints a status change in place, building nothing again and asking nothing', async () => {
    let status = 'unknown';
    const seg = counted();
    const { sidebar, root } = await build({ transcript: film(), segmenter: () => seg, statusOf: () => status });
    await counts(sidebar);
    expect(sidebar.stats).toEqual({ known: 0, unknown: 3 * LENGTH, i1: 0 });

    const row = root.querySelector<HTMLElement>('.line[data-i="3"]')!;
    const word = row.querySelector<HTMLElement>('.w')!;
    expect(word.dataset.s).toBe('unknown');
    expect(row.querySelector('.x')?.textContent).toBe('3 new');
    const asked = seg.total();

    status = 'known';
    sidebar.refreshStatus();
    expect(root.querySelector('.line[data-i="3"] .w')).toBe(word);
    expect(word.dataset.s).toBe('known');
    expect(row.querySelector('.x')?.textContent).toBe('');
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    expect(seg.total()).toBe(asked);

    // Readings and filters change classes, not rows.
    await setSetting('ruby', 'never');
    filterButton(root, 'Has new words').click();
    expect(shown(root)).toHaveLength(0);
    filterButton(root, 'All lines').click();
    expect(root.querySelector('.line[data-i="3"] .w')).toBe(word);
    expect(seg.total()).toBe(asked);
  });

  it('rebuilds for a new analyser only the rows near the screen', async () => {
    await setSetting('sidebarStats', false);
    let seg: Segmenter = counted();
    const { sidebar, root } = await build({ transcript: film(), segmenter: () => seg });
    await rowsBy(root, LENGTH);
    const near = root.querySelector<HTMLElement>('.line[data-i="0"]')!;
    const far = root.querySelector<HTMLElement>('.line[data-i="2000"]')!;
    expect(near.querySelectorAll('.w')).toHaveLength(3);
    expect(far.querySelector('.w')).toBeNull();

    // The better analyser reads each line as one word.
    const whole = counted();
    seg = { ...whole, segment: (text: string) => [{ surface: text, start: 0, end: text.length, content: true }] };
    sidebar.refreshAnalysis();
    expect(near.querySelectorAll('.w')).toHaveLength(1);
    expect(far.querySelector('.w')).toBeNull();
    expect(root.querySelector('.line[data-i="0"]')).toBe(near);
  });

  it('makes the block a jump lands in, and lands on the row', async () => {
    seek = vi.fn<(t: number) => void>();
    const seg = counted();
    const { sidebar, root } = openNow({ segmenter: () => seg });
    expect(root.querySelector('.line[data-i="2500"]')).toBeNull();

    const input = root.querySelector<HTMLInputElement>('.search input')!;
    input.value = 'w2500';
    input.dispatchEvent(new Event('input'));
    const hit = root.querySelector<HTMLElement>('.line.hit-cur')!;
    expect(hit.dataset.i).toBe('2500');
    expect(hit.parentElement!.children).toHaveLength(10);        // its whole block, made
    expect(root.querySelector('.line[data-i="2000"]')).toBeNull(); // and nothing between
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await builtBy([hit]);
    expect(hit.querySelector('.w')).not.toBeNull();

    // Playback far ahead of anything made yet: its block is made to mark it.
    sidebar.setActive(1805);
    expect(root.querySelector<HTMLElement>('.line.cur')?.dataset.i).toBe('1805');
  });

  it('measures once per follow step, before building, and not again while it builds', async () => {
    const seg = counted();
    const { sidebar, root } = await build({ transcript: film(), segmenter: () => seg });
    await rowsBy(root, 100);
    const after = root.querySelector('.line[data-i="46"]')!;
    expect(after.querySelector('.w')).toBeNull();
    // What the rows around the line looked like at the moment of measuring.
    const builtWhenMeasured: boolean[] = [];
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => {
      builtWhenMeasured.push(after.querySelector('.w') !== null);
      return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    try {
      sidebar.setActive(40);
      // The line and the list, once each — and before a single row was built,
      // so the measurement never has freshly built rows to lay out.
      expect(builtWhenMeasured).toEqual([false, false]);
      measure.mockClear();
      await builtBy([after]);
      expect(after.querySelector('.w')).not.toBeNull();
      expect(measure).not.toHaveBeenCalled();
    } finally {
      measure.mockRestore();
    }
  });

  it('lets go of a held jump as soon as following moves on', async () => {
    const { sidebar } = await build({ transcript: film(), segmenter: () => counted() });
    sidebar.setActive(10);
    // Reopening puts the list back at once and holds it for a few frames…
    sidebar.toggle(false);
    sidebar.toggle(true);
    // …until the next line takes over; nothing is measured for the old hold.
    sidebar.setActive(11);
    const measure = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    try {
      await wait(60);
      expect(measure).not.toHaveBeenCalled();
    } finally {
      measure.mockRestore();
    }
  });

  it('keeps the totals standing while a line observed during playback is counted', async () => {
    const q = queued();
    const transcript = new Transcript();
    transcript.observe('first line', 10);
    const { sidebar, root } = await build({ transcript, segmenter: () => q.seg });
    await q.drain();
    expect(sidebar.stats).not.toBeNull();

    transcript.observe('second line', 20);
    expect(q.waiting.length).toBeGreaterThan(0);
    expect(sidebar.stats).not.toBeNull();
    expect(root.querySelector('.summary')?.textContent).not.toContain('Counting');
    await q.drain();
    expect(root.querySelectorAll('.line')).toHaveLength(2);
    expect(sidebar.stats).not.toBeNull();
  });
});

describe('Sidebar phrases', () => {
  it('reports a selection across words in one line as a phrase, and does not seek', async () => {
    const transcript = new Transcript();
    transcript.setFull([{ start: 0, end: 3, text: '気 に する' }, { start: 8, end: 11, text: '勉強 です', secondary: 'study' }]);
    const onPhrase = vi.fn();
    const onWordClick = vi.fn();
    const { root } = await build({ transcript, onPhrase, onWordClick, segmenter: () => segmenter });
    const words = Array.from(root.querySelectorAll<HTMLElement>('.line[data-i="1"] .w'));
    expect(words.map((w) => w.textContent?.replace(/べんきょう/, ''))).toEqual(['勉強', 'です']);
    const range = document.createRange();
    range.setStart(words[0]!, 0);
    range.setEnd(words[1]!, words[1]!.childNodes.length);
    (root as unknown as { getSelection: () => unknown }).getSelection = () => ({ isCollapsed: false, rangeCount: 1, getRangeAt: () => range });
    words[1]!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    words[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onPhrase).toHaveBeenCalledOnce();
    const [toks, text, el, sentence, context] = onPhrase.mock.calls[0]!;
    expect((toks as Token[]).map((t) => t.surface)).toEqual(['勉強', 'です']);
    expect(text).toBe('勉強です');
    expect(el).toBe(words[1]);
    expect(sentence).toBe('勉強 です');
    expect(context).toEqual({ start: 8, end: 11, translation: 'study' });
    expect(onWordClick).not.toHaveBeenCalled();
    expect(seek).not.toHaveBeenCalled();
  });
});

describe('Sidebar phrases, clicked again', () => {
  it('tells a plain click on the marked phrase from picking it, and drops it when told to', async () => {
    const transcript = new Transcript();
    transcript.setFull([{ start: 0, end: 3, text: '勉強 です' }]);
    const onPhrase = vi.fn<NonNullable<SidebarDeps['onPhrase']>>();
    const { root } = await build({ transcript, onPhrase, segmenter: () => segmenter });
    const words = Array.from(root.querySelectorAll<HTMLElement>('.line .w'));
    const range = document.createRange();
    range.setStart(words[0]!, 0);
    range.setEnd(words[1]!, words[1]!.childNodes.length);
    const removeAllRanges = vi.fn();
    (root as unknown as { getSelection: () => unknown }).getSelection = () => ({
      isCollapsed: false, rangeCount: 1, getRangeAt: () => range, removeAllRanges, setBaseAndExtent: () => {},
    });
    const press = (el: HTMLElement, shiftKey = false): void => {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, shiftKey }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    // Picked: a new phrase. Then marked, as the selection is drawn.
    press(words[1]!);
    expect(onPhrase.mock.calls[0]?.[5]).toBe(false);
    document.dispatchEvent(new Event('selectionchange'));
    await new Promise((r) => setTimeout(r, 40));
    expect(words[0]!.classList.contains('inphrase')).toBe(true);

    // Shift held, it is the selection being moved, not the phrase clicked.
    press(words[0]!, true);
    expect(onPhrase.mock.calls[1]?.[5]).toBe(false);

    // A plain click on it is the phrase again; told to drop it, the panel does.
    onPhrase.mockReturnValue(false);
    press(words[0]!);
    expect(onPhrase.mock.calls[2]?.[5]).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(removeAllRanges).toHaveBeenCalled();
  });
});

describe('Sidebar keys', () => {
  it('shows the keys in a view of their own, and goes back to the transcript', async () => {
    const { root } = await build();
    const button = root.querySelector<HTMLButtonElement>('header button[aria-label="Keyboard shortcuts"]')!;
    button.click();
    expect(root.querySelector('.viewtitle')?.textContent).toBe('Keyboard shortcuts');
    expect(root.querySelectorAll('.keysview .keys dt')).toHaveLength(10);
    expect(root.querySelector('.keysview .grp')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    button.click();
    expect(root.querySelector('[role=tab][aria-selected="true"]')?.getAttribute('data-mode')).toBe('transcript');
    expect(root.querySelector<HTMLElement>('.viewtitle')?.hidden).toBe(true);
    expect(root.querySelector('.keysview')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps them out of its settings', async () => {
    const { sidebar, root } = await build();
    sidebar.setMode('settings');
    expect(root.querySelector('.settings .keys')).toBeNull();
    expect(root.querySelector('.settings .grp')?.textContent).toBe('Languages');
  });
});
