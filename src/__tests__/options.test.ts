import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The first-run checklist's deck step. It used to tick as soon as any deck was
 * in settings — and the settings panel filled one in by itself, so the step
 * that asks a learner to choose where cards go was done before they looked.
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
      for (const name of ['Default', 'Mining']) {
        const o = document.createElement('option');
        o.value = o.textContent = name;
        deck.appendChild(o);
      }
      deck.addEventListener('change', () => void setSetting('deck', deck.value));
      root.appendChild(deck);
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
    sel.value = 'Mining';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(step().classList.contains('done')).toBe(true));
  });

  it('reopens if the deck changes without anyone choosing it', async () => {
    await open({ configured: true, deck: 'Default' }, 'Default');
    expect(step().classList.contains('done')).toBe(true);
    const { setSetting } = await import('../settings');
    await setSetting('deck', 'Mining');
    expect(step().classList.contains('done')).toBe(false);
  });

  it('has nothing to keep when no deck is set', async () => {
    await open({ configured: true, deck: '' });
    expect(step().classList.contains('done')).toBe(false);
    expect(keep().hidden).toBe(true);
  });
});
