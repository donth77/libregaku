import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnkiState } from '../../anki/client';

/**
 * A <select> only speaks strings. The one thing worth pinning here is that a
 * numeric setting comes back out as a number, or every consumer would be
 * doing arithmetic on "140".
 *
 * And the deck lists: they are the one place the panel could make a choice
 * for the learner, which it must not.
 */

const anki = vi.hoisted(() => ({
  probe: vi.fn<() => Promise<AnkiState>>(),
}));

// The panel's view of Anki, answered here rather than through the service
// worker, so each test says exactly what Anki reports.
vi.mock('../../anki/client', () => ({
  probe: anki.probe,
  browseOurCards: async () => {},
  createDeck: async () => {},
}));

/** Sync storage that keeps what is written, so a rebuilt panel reads it back. */
const store = new Map<string, unknown>();

vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: async (key: string) => ({ [key]: store.get(key) }),
      set: async (patch: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(patch)) store.set(k, v);
      },
    },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: {
    getURL: (p: string) => `chrome-extension://testid/${p}`,
  },
});

import { buildSettings, syncSettingsControls } from '../settings-panel';
import { setSetting, settings } from '../../settings';

const OFFLINE: AnkiState = { kind: 'offline' };
const connected = (decks: string[]): AnkiState => ({ kind: 'connected', decks, cards: 3, installed: 'present' });

const flush = () => new Promise((r) => setTimeout(r, 0));

function rowFor(root: HTMLElement, name: string): HTMLElement {
  const row = Array.from(root.querySelectorAll<HTMLElement>('label.set'))
    .find((r) => r.querySelector('.name')?.textContent === name);
  if (!row) throw new Error(`no setting named ${name}`);
  return row;
}

const selectFor = (root: HTMLElement, name: string): HTMLSelectElement => rowFor(root, name).querySelector('select')!;
const switchFor = (root: HTMLElement, name: string): HTMLInputElement => rowFor(root, name).querySelector('input')!;
const hintOf = (el: Element): HTMLElement => el.closest('label.set')!.querySelector<HTMLElement>('.hint')!;
const shown = (sel: HTMLSelectElement): string | null | undefined => sel.options[sel.selectedIndex]?.textContent;

const choose = (sel: HTMLSelectElement, value: string): void => {
  sel.value = value;
  sel.dispatchEvent(new Event('change'));
};

beforeEach(async () => {
  anki.probe.mockReset().mockResolvedValue(OFFLINE);
  await setSetting('deck', '');
  await setSetting('statusScope', '');
});

describe('settings panel selects', () => {
  it('stores a numeric setting as a number', () => {
    const root = buildSettings(() => {});
    choose(selectFor(root, 'Text size'), '140');
    choose(selectFor(root, 'Position'), '25');
    expect(settings().subtitleSize).toBe(140);
    expect(settings().subtitleBottom).toBe(25);
  });

  it('leaves a string setting as a string', () => {
    const root = buildSettings(() => {});
    choose(selectFor(root, 'Furigana'), 'always');
    expect(settings().ruby).toBe('always');
  });

  it('names every control and links its explanation', () => {
    const root = buildSettings(() => {});
    const controls = Array.from(root.querySelectorAll<HTMLElement>('select, input'));
    expect(controls.length).toBeGreaterThan(10);
    for (const c of controls) {
      expect(c.closest('label.set')?.querySelector('.name')?.textContent).toBeTruthy();
      const by = c.getAttribute('aria-describedby');
      if (by) expect(root.querySelector(`#${by}`)?.textContent).toBeTruthy();
    }
    for (const box of Array.from(root.querySelectorAll('input[type=checkbox]'))) {
      expect(box.getAttribute('role')).toBe('switch');
    }
  });

  it('gives the Anki dropdowns the same row as every other setting, hidden until there is a deck to pick', () => {
    const root = buildSettings(() => {});
    const deck = root.querySelector<HTMLSelectElement>('select[name=deck]')!;
    const scope = root.querySelector<HTMLSelectElement>('select[name=statusScope]')!;
    for (const sel of [deck, scope]) {
      const row = sel.closest('label.set') as HTMLElement;
      expect(row).not.toBeNull();
      expect(row.hidden).toBe(true);
      expect(sel.disabled).toBe(true);
    }
    expect(root.querySelector('.state')?.getAttribute('role')).toBe('status');
  });

  it('spells out how to connect Anki, including the line only this extension can supply', () => {
    const root = buildSettings(() => {});
    const steps = Array.from(root.querySelectorAll('.steps li')).map((li) => li.getAttribute('data-need'));
    expect(steps).toEqual(['install', 'addon', 'origin', 'running']);
    const chips = Array.from(root.querySelectorAll('.chip code')).map((c) => c.textContent);
    expect(chips).toContain('2055492159');
    expect(chips).toContain('chrome-extension://testid');
    for (const b of Array.from(root.querySelectorAll('.chip button'))) {
      expect(b.getAttribute('aria-label')).toMatch(/^Copy /);
    }
  });

  it('lists the player\'s keys, so they can be found', () => {
    const root = buildSettings(() => {});
    const keys = Array.from(root.querySelectorAll('.keys dt')).map((dt) => dt.textContent);
    expect(keys).toEqual(['←→', '↓', '↑', 'A', 'K', 'R', 'H', 'B', 'S', 'Esc']);
    expect(root.querySelector('.keys dd')?.textContent).toBe('The line before, the line after');
  });

  it('offers pronunciation on cards, on unless turned off', () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Pronunciation on cards').checked).toBe(true);
  });

  it('offers sentence audio and pictures on cards, both on unless turned off', () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Sentence audio on cards').checked).toBe(true);
    expect(switchFor(root, 'Picture on cards').checked).toBe(true);
  });

  it('sends the transcript panel to the settings page for the Netflix permission, which it cannot ask for', async () => {
    const sent: unknown[] = [];
    const runtime = (globalThis as unknown as { chrome: { runtime: Record<string, unknown> } }).chrome.runtime;
    runtime.sendMessage = async (msg: unknown) => { sent.push(msg); return { ok: true, granted: false }; };
    const root = buildSettings(() => {});
    await flush();
    const row = Array.from(root.querySelectorAll<HTMLElement>('.set')).find((r) => r.querySelector('.name')?.textContent === 'Sentence audio on Netflix')!;
    const button = row.querySelector<HTMLButtonElement>('.perm')!;
    expect(button.textContent).toBe('Allow in settings');
    button.click();
    expect(sent).toContainEqual({ type: 'open-options' });
    delete runtime.sendMessage;
  });

  it('says that cards wait for Anki while it is closed', async () => {
    const root = buildSettings(() => {});
    await flush();
    expect(root.querySelector('.state')?.textContent).toContain('cards you add wait here, and go in when it opens');
  });

  // Once relied on an earlier test having chosen these values; it now makes
  // its own choices, so it passes alone and in any order.
  it('shows the stored value when rebuilt', async () => {
    choose(selectFor(buildSettings(() => {}), 'Text size'), '120');
    choose(selectFor(buildSettings(() => {}), 'Position'), '18');
    await flush();
    const saved = store.get('libregaku.settings') as { subtitleSize?: number; subtitleBottom?: number };
    expect(saved).toMatchObject({ subtitleSize: 120, subtitleBottom: 18 });

    const root = buildSettings(() => {});
    expect(selectFor(root, 'Text size').value).toBe('120');
    expect(selectFor(root, 'Position').value).toBe('18');
  });

  it('can be brought back in step with settings changed elsewhere', async () => {
    const root = buildSettings(() => {});
    await setSetting('ruby', 'never');
    await setSetting('sidebarOpen', false);
    expect(selectFor(root, 'Furigana').value).not.toBe('never');
    syncSettingsControls(root);
    expect(selectFor(root, 'Furigana').value).toBe('never');
    expect(switchFor(root, 'Show the panel').checked).toBe(false);
    await setSetting('sidebarOpen', true);
    syncSettingsControls(root);
    expect(switchFor(root, 'Show the panel').checked).toBe(true);
  });
});

describe('settings panel decks', () => {
  it('never picks a deck for new cards on the learner\'s behalf', async () => {
    anki.probe.mockResolvedValue(connected(['Core 2k', 'Vocabulary']));
    const root = buildSettings(() => {});
    await flush();
    const deck = root.querySelector<HTMLSelectElement>('select[name=deck]')!;

    expect(settings().deck).toBe('');
    expect(deck.value).toBe('');
    expect(shown(deck)).toBe('Choose a deck…');
    expect(hintOf(deck).classList.contains('warn')).toBe(true);

    choose(deck, 'Vocabulary');
    expect(settings().deck).toBe('Vocabulary');
    expect(hintOf(deck).classList.contains('warn')).toBe(false);
    expect(hintOf(deck).textContent).toBe('One deck, for everything Libregaku creates.');
  });

  it('shows a stored deck Anki no longer has as missing, instead of swapping it', async () => {
    await setSetting('deck', 'Old::Vocabulary');
    await setSetting('statusScope', 'Old');
    anki.probe.mockResolvedValue(connected(['Core 2k', 'Vocabulary']));
    const root = buildSettings(() => {});
    await flush();
    const deck = root.querySelector<HTMLSelectElement>('select[name=deck]')!;
    const scope = root.querySelector<HTMLSelectElement>('select[name=statusScope]')!;

    expect(settings().deck).toBe('Old::Vocabulary');
    expect(deck.value).toBe('Old::Vocabulary');
    expect(shown(deck)).toBe('Old::Vocabulary — not in Anki');
    expect(hintOf(deck).classList.contains('warn')).toBe(true);

    // Not "Whole collection": the stored scope is still the one being read.
    expect(settings().statusScope).toBe('Old');
    expect(scope.value).toBe('Old');
    expect(shown(scope)).toBe('Old — not in Anki');
    expect(hintOf(scope).textContent).toContain('every word reads as unknown');
  });

  it('leaves a deck that exists exactly as it is', async () => {
    await setSetting('deck', 'Vocabulary');
    anki.probe.mockResolvedValue(connected(['Core 2k', 'Vocabulary']));
    const root = buildSettings(() => {});
    await flush();
    const deck = root.querySelector<HTMLSelectElement>('select[name=deck]')!;
    expect(deck.value).toBe('Vocabulary');
    expect(hintOf(deck).classList.contains('warn')).toBe(false);
    expect(Array.from(deck.options).map((o) => o.value)).toEqual(['Core 2k', 'Vocabulary']);
  });

  it('says so when Check again reaches Anki, and only then', async () => {
    const onAnkiConnected = vi.fn();
    const root = buildSettings(() => {}, { onAnkiConnected });
    await flush();
    const recheck = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Check again')!;

    recheck.click();
    await flush();
    expect(onAnkiConnected).not.toHaveBeenCalled();   // still offline

    anki.probe.mockResolvedValue(connected(['Vocabulary']));
    recheck.click();
    await flush();
    expect(onAnkiConnected).toHaveBeenCalledOnce();
  });
});
