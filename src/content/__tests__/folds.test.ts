import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored: Record<string, unknown> = {};

beforeEach(() => {
  vi.resetModules();
  for (const k of Object.keys(stored)) delete stored[k];
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: stored[key] }),
        set: async (o: Record<string, unknown>) => void Object.assign(stored, o),
      },
    },
  };
});

function panel(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = ['languages', 'looking-words-up', 'word-popup', 'subtitles', 'underlines', 'transcript', 'anki', 'anki-cards', 'data-and-licences']
    .map((id) => `<section class="grp-section" id="lg-${id}"><div class="grp-head"><h2 class="grp">${id}</h2></div><div class="grp-rows"></div></section>`)
    .join('');
  return root;
}
const folded = (root: HTMLElement, id: string): boolean => root.querySelector(`#lg-${id}`)!.hasAttribute('data-folded');
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('settings groups that fold', () => {
  it('start open for Languages, Anki and Anki cards, and folded for the rest', async () => {
    const { foldable } = await import('../folds');
    const root = panel();
    foldable(root);
    const ids = ['languages', 'looking-words-up', 'word-popup', 'subtitles', 'underlines', 'transcript', 'anki', 'anki-cards', 'data-and-licences'];
    expect(ids.map((id) => folded(root, id))).toEqual([false, true, true, true, true, true, false, false, true]);
    expect(root.querySelector('#lg-anki .grp')?.textContent).toBe('anki');
    expect(root.querySelector('#lg-anki button.fold')?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#lg-data-and-licences button.fold')?.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('#lg-anki-cards button.fold')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('fold and open on a click, and remember it', async () => {
    const { foldable } = await import('../folds');
    const root = panel();
    foldable(root);
    root.querySelector<HTMLButtonElement>('#lg-anki button.fold')!.click();
    expect(folded(root, 'anki')).toBe(true);
    await flush();
    expect(stored['libregaku.settings.folded.v2']).toEqual({ 'lg-anki': true });

    vi.resetModules();
    const again = await import('../folds');
    const next = panel();
    again.foldable(next);
    await flush();
    expect(folded(next, 'anki')).toBe(true);
    expect(folded(next, 'languages')).toBe(false);
  });

  it('stay open while searching, and open for a link', async () => {
    const { foldable, showFolds, unfold } = await import('../folds');
    const root = panel();
    foldable(root);
    showFolds(root, true);
    expect(root.querySelector('#lg-data-and-licences button.fold')?.getAttribute('aria-expanded')).toBe('true');
    unfold(root, 'lg-data-and-licences');
    expect(folded(root, 'data-and-licences')).toBe(false);
  });
});
