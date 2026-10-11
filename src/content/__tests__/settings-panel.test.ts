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

import { buildSettings, builtLabel, keysView, outsideScope, syncSettingsControls } from '../settings-panel';
import { DEFAULTS, setSetting, settings } from '../../settings';

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

  it('keeps the settings together, with the credits after them and no keys among them', () => {
    const root = buildSettings(() => {});
    const groups = Array.from(root.querySelectorAll('.grp')).map((h) => h.textContent);
    expect(groups).toEqual([
      'Languages', 'Looking words up', 'Word popup', 'Subtitles', 'Underlines', 'Transcript', 'Anki', 'Anki cards',
      'Data and licences',
    ]);
    expect(root.querySelector('.keys')).toBeNull();
  });

  it('gives each group a section of its own, with an id to link to and a line on what it is for', () => {
    const root = buildSettings(() => {});
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.grp-section'));
    expect(sections.map((s) => s.id)).toEqual([
      'lg-languages', 'lg-looking-words-up', 'lg-word-popup', 'lg-subtitles', 'lg-underlines', 'lg-transcript', 'lg-anki',
      'lg-anki-cards', 'lg-data-and-licences',
    ]);
    for (const s of sections.slice(0, -1)) expect(s.querySelector('.grp-about')?.textContent).toBeTruthy();
    // Every row sits inside its own section.
    for (const row of Array.from(root.querySelectorAll('label.set'))) expect(row.closest('.grp-rows')).not.toBeNull();
    expect(root.querySelector('#lg-anki-cards')?.querySelectorAll('label.set').length).toBe(3);
  });

  it('says when the copy running was built, so an old one can be told apart', () => {
    expect(builtLabel('2026-10-10T21:08:00Z')).toMatch(/^This copy was built .*10.*\.$/);
    expect(builtLabel('')).toBe('');
    expect(builtLabel('not a date')).toBe('');
  });

  it('shows Furigana and Kanji only while the language learned has them', async () => {
    const shown = (root: HTMLElement, name: string): boolean => {
      const row = Array.from(root.querySelectorAll<HTMLElement>('label.set')).find((r) => r.querySelector('.name')?.textContent === name);
      return Boolean(row) && !row!.hidden;
    };
    let root = buildSettings(() => {});
    expect(shown(root, 'Furigana')).toBe(true);
    expect(shown(root, 'Kanji breakdown')).toBe(true);
    await setSetting('target', 'es');
    try {
      syncSettingsControls(root);
      expect(shown(root, 'Furigana')).toBe(false);
      expect(shown(root, 'Kanji breakdown')).toBe(false);
      root = buildSettings(() => {});
      expect(shown(root, 'Furigana')).toBe(false);
      expect(Array.from(keysView().querySelectorAll('.keys dt')).map((dt) => dt.textContent)).not.toContain('R');
    } finally {
      await setSetting('target', 'ja');
    }
  });

  it('keeps the translation and the definitions apart, each with its own languages', async () => {
    const root = buildSettings(() => {});
    const translation = root.querySelector<HTMLSelectElement>('select[name=native]')!;
    const definitions = root.querySelector<HTMLSelectElement>('select[name=definitions]')!;
    const codes = (sel: HTMLSelectElement): string[] => Array.from(sel.options).map((o) => o.value);
    expect(codes(translation)).toEqual(expect.arrayContaining(['en', 'ja', 'zh', 'ko', 'es']));
    expect(codes(translation)).not.toContain('sl');
    expect(codes(definitions)).toEqual(expect.arrayContaining(['en', 'hu', 'sl']));
    // Definitions are a choice only where the language learned has a dictionary.
    expect((definitions.closest('label.set') as HTMLElement).hidden).toBe(false);
    await setSetting('target', 'es');
    try {
      syncSettingsControls(root);
      expect((definitions.closest('label.set') as HTMLElement).hidden).toBe(true);
    } finally {
      await setSetting('target', 'ja');
    }
  });

  it('keeps a translation chosen from the old list, rather than changing it unasked', async () => {
    await setSetting('native', 'hu');
    try {
      const translation = buildSettings(() => {}).querySelector<HTMLSelectElement>('select[name=native]')!;
      expect(translation.value).toBe('hu');
      expect(translation.selectedOptions[0]?.textContent).toBe('Hungarian');
    } finally {
      await setSetting('native', 'en');
    }
  });

  it('offers to keep marks in this browser instead of Anki, kept in Anki unless turned off', () => {
    expect(switchFor(buildSettings(() => {}), 'Keep marks in Anki').checked).toBe(true);
  });

  it('knows which decks the word status reads', () => {
    expect(outsideScope('Japanese::Netflix', 'Japanese')).toBe(false);
    expect(outsideScope('Japanese', 'Japanese')).toBe(false);
    expect(outsideScope('Japanese Core', 'Japanese')).toBe(true);
    expect(outsideScope('Test Deck', 'Japanese')).toBe(true);
    expect(outsideScope('Test Deck', '')).toBe(false);
    expect(outsideScope('', 'Japanese')).toBe(false);
  });

  it('lists the player\'s keys in a view of their own', () => {
    const root = keysView();
    const keys = Array.from(root.querySelectorAll('.keys dt')).map((dt) => dt.textContent);
    expect(keys).toEqual(['←→', '↓', '↑', 'A', 'K', 'R', 'H', 'B', 'S', 'Esc']);
    expect(root.querySelector('.keys dd')?.textContent).toBe('Previous or next line');
  });

  it('lists Shift among the keys only while cards open on it', async () => {
    await setSetting('interaction', 'shift');
    try {
      const keys = Array.from(keysView().querySelectorAll('.keys dt')).map((dt) => dt.textContent);
      expect(keys).toContain('Shift');
    } finally {
      await setSetting('interaction', 'hover');
    }
  });

  it('opens the card on hover, on hover with Shift held, or on a click', () => {
    const root = buildSettings(() => {});
    const select = root.querySelector<HTMLSelectElement>('select[data-key="interaction"]')
      ?? Array.from(root.querySelectorAll('select')).find((x) => Array.from(x.options).some((o) => o.value === 'shift'));
    expect(Array.from(select!.options).map((o) => [o.value, o.textContent]))
      .toEqual([['hover', 'Hover'], ['shift', 'Hover with Shift held'], ['click', 'Click']]);
  });

  it('offers pronunciation on cards, on unless turned off', () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Word audio').checked).toBe(true);
  });

  it("offers the word's other lines on its card, on unless turned off", () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Examples from this video').checked).toBe(true);
    expect(switchFor(root, 'Examples from this video').closest('#lg-word-popup')).not.toBeNull();
  });

  it('offers sentence audio and pictures on cards, both on unless turned off', () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Sentence audio').checked).toBe(true);
    expect(switchFor(root, 'Screenshot').checked).toBe(true);
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
    expect(root.querySelector('.state')?.textContent).toContain('new cards wait here and are added when it opens');
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
    expect(switchFor(root, 'Show the transcript panel').checked).toBe(false);
    await setSetting('sidebarOpen', true);
    syncSettingsControls(root);
    expect(switchFor(root, 'Show the transcript panel').checked).toBe(true);
  });

  it('offers a colour for each underline, and underlines the row in it', async () => {
    for (const key of ['colorUnknown', 'colorLearning', 'colorTracking', 'colorKnown'] as const) {
      await setSetting(key, DEFAULTS[key]);
    }
    const root = buildSettings(() => {});
    const pickers = Array.from(root.querySelectorAll<HTMLInputElement>('#lg-underlines input[type=color]'));
    expect(pickers.map((p) => p.dataset.setting)).toEqual(['colorUnknown', 'colorLearning', 'colorTracking', 'colorKnown']);
    expect(pickers.map((p) => p.value)).toEqual(['#e5806c', '#d9a64a', '#a78bfa', '#63af97']);
    const learning = rowFor(root, 'Learning');
    expect(learning.style.getPropertyValue('--c')).toBe('#d9a64a');

    // Dragging in the picker repaints the row; letting go saves it.
    const picker = learning.querySelector('input')!;
    picker.value = '#3366ff';
    picker.dispatchEvent(new Event('input'));
    expect(learning.style.getPropertyValue('--c')).toBe('#3366ff');
    expect(settings().colorLearning).toBe('#d9a64a');
    picker.dispatchEvent(new Event('change'));
    expect(settings().colorLearning).toBe('#3366ff');
  });

  it('puts every underline colour back with Reset', async () => {
    await setSetting('colorUnknown', '#000000');
    await setSetting('colorKnown', '#ffffff');
    const root = buildSettings(() => {});
    expect(rowFor(root, 'New words').querySelector('input')!.value).toBe('#000000');
    const reset = Array.from(root.querySelectorAll<HTMLButtonElement>('#lg-underlines button'))
      .find((b) => b.textContent === 'Reset')!;
    reset.click();
    expect(settings().colorUnknown).toBe('#e5806c');
    expect(settings().colorKnown).toBe('#63af97');
    expect(rowFor(root, 'New words').querySelector('input')!.value).toBe('#e5806c');
    expect(rowFor(root, 'New words').style.getPropertyValue('--c')).toBe('#e5806c');
  });

  it('keeps Underline known words with the underline colours', () => {
    const root = buildSettings(() => {});
    expect(switchFor(root, 'Underline known words').closest('#lg-underlines')).not.toBeNull();
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
    expect(hintOf(deck).textContent).toBe('The deck every new card is added to.');
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
    expect(hintOf(scope).textContent).toContain('every word shows as new');
  });

  it('says so when new cards would go to a deck the word status does not read', async () => {
    await setSetting('deck', 'Japanese');
    await setSetting('statusScope', 'Japanese');
    anki.probe.mockResolvedValue(connected(['Japanese', 'Japanese::Netflix', 'Test Deck']));
    const root = buildSettings(() => {});
    await flush();
    const deck = root.querySelector<HTMLSelectElement>('select[name=deck]')!;
    const scope = root.querySelector<HTMLSelectElement>('select[name=statusScope]')!;
    expect(hintOf(scope).classList.contains('warn')).toBe(false);

    // A subdeck is read with its parent.
    choose(deck, 'Japanese::Netflix');
    await flush();
    expect(hintOf(scope).classList.contains('warn')).toBe(false);

    choose(deck, 'Test Deck');
    await flush();
    expect(hintOf(scope).classList.contains('warn')).toBe(true);
    expect(hintOf(scope).textContent).toContain('New cards go to “Test Deck”, which isn\'t included here');

    // Reading the whole collection settles it.
    choose(scope, '');
    await flush();
    expect(hintOf(scope).classList.contains('warn')).toBe(false);
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
