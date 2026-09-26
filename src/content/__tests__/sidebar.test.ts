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
import type { Segmenter, Token } from '../../morphology/types';

const flush = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LINES = ['a', 'b new', 'c', 'd'].map((text, i) => ({ start: i * 4, end: i * 4 + 3, text }));

/** Words split on spaces, with readings for the two that have kanji. */
const READINGS: Record<string, string> = { 食べる: 'たべる', 勉強: 'べんきょう' };
const segmenter: Segmenter = {
  tier: 2,
  hasLemma: true,
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
});

describe('Sidebar vocabulary counts', () => {
  it('updates counts, the summary, and the active i+1 filter after marking and unmarking a word', async () => {
    let unknown = 1;
    const { sidebar, root } = await build({
      measure: async (text) => ({ unknown: text.includes('new') ? unknown : 0, words: 2 }),
    });
    filterButton(root, 'Ready to learn').click();
    expect(root.querySelectorAll('.line')).toHaveLength(1);
    expect(sidebar.stats?.unknown).toBe(1);

    unknown = 0;
    sidebar.refreshAnalysis();
    await flush();
    expect(sidebar.stats).toEqual({ known: 100, unknown: 0, i1: 0 });
    expect(root.querySelector('.summary')?.textContent).toContain('100% known');
    expect(root.querySelectorAll('.line')).toHaveLength(0);

    unknown = 1;
    sidebar.refreshAnalysis();
    await flush();
    expect(sidebar.stats?.i1).toBe(1);
    expect(root.querySelectorAll('.line')).toHaveLength(1);
    expect(root.querySelector('.line .x')?.textContent).toBe('1 new');
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
    expect(root.querySelectorAll('.line')).toHaveLength(1);

    await setSetting('sidebarStats', false);
    expect(root.querySelectorAll('.line')).toHaveLength(LINES.length);
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
    expect(root.querySelectorAll('.line')).toHaveLength(1);
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
      { start: 8, translation: 'eat' },
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
