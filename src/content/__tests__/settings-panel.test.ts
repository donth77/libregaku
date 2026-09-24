import { describe, expect, it, vi } from 'vitest';

/**
 * A <select> only speaks strings. The one thing worth pinning here is that a
 * numeric setting comes back out as a number, or every consumer would be
 * doing arithmetic on "140".
 */

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: {
    getURL: (p: string) => `chrome-extension://testid/${p}`,
    // What the service worker reports when Anki is closed.
    sendMessage: async () => ({ ok: false, kind: 'offline', offline: true, error: 'Nothing is listening on port 8765.' }),
  },
});

import { buildSettings } from '../settings-panel';
import { settings } from '../../settings';

function selectFor(root: HTMLElement, name: string): HTMLSelectElement {
  const row = Array.from(root.querySelectorAll<HTMLElement>('label.set'))
    .find((r) => r.querySelector('.name')?.textContent === name);
  if (!row) throw new Error(`no setting named ${name}`);
  return row.querySelector('select')!;
}

const choose = (sel: HTMLSelectElement, value: string): void => {
  sel.value = value;
  sel.dispatchEvent(new Event('change'));
};

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

  it('shows the stored value when rebuilt', () => {
    const root = buildSettings(() => {});
    expect(selectFor(root, 'Text size').value).toBe('140');
    expect(selectFor(root, 'Position').value).toBe('25');
  });
});
