import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Following playback is the one piece of the panel with state that can go
 * quietly wrong: the transcript still renders, it just stops moving. These
 * pin down when it follows, when it stops, and what brings it back.
 */

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { sendMessage: async () => ({}) },
});

import { Sidebar } from '../sidebar';
import type { SidebarDeps } from '../sidebar';
import { Transcript } from '../transcript';
import { setSetting } from '../../settings';

const flush = () => new Promise((r) => setTimeout(r, 0));

const LINES = ['a', 'b new', 'c', 'd'].map((text, i) => ({ start: i * 4, end: i * 4 + 3, text }));

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

beforeEach(() => {
  scrollTo = vi.fn();
  scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { value: scrollTo, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true });
});

afterEach(async () => {
  sidebars.splice(0).forEach((sidebar) => sidebar.destroy());
  document.body.replaceChildren();
  await setSetting('sidebarFollow', true);
  await setSetting('sidebarOpen', true);
});

describe('Sidebar vocabulary counts', () => {
  it('updates counts, the summary, and the active i+1 filter after marking and unmarking a word', async () => {
    let unknown = 1;
    const { sidebar, root } = await build({
      measure: async (text) => ({ unknown: text.includes('new') ? unknown : 0, words: 2 }),
    });
    const ready = Array.from(root.querySelectorAll<HTMLButtonElement>('.filters .f'))
      .find((b) => b.textContent === 'Ready to learn')!;
    ready.click();
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
    const hasNew = Array.from(root.querySelectorAll<HTMLElement>('.filters .f'))
      .find((b) => b.textContent === 'Has new words')!;
    hasNew.click();
    expect(root.querySelectorAll('.line')).toHaveLength(1);
    sidebar.setActive(1);
    expect(root.querySelector('.line.cur')?.getAttribute('data-i')).toBe('1');
  });
});
