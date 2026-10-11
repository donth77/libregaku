import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnkiState } from '../anki/client';

/**
 * The toolbar popup's Anki line. It used to be a yes/no on whether anything
 * answered, so a port held by another program read "Anki not running" while
 * Anki sat open — which is exactly the state of the machine this was found on.
 */

/** What the service worker answers for each AnkiConnect action. */
let answers: Record<string, unknown>;
/** chrome.storage.local, where cards made while Anki was closed wait. */
let local: Record<string, unknown>;

/** The parts of action.html the script reaches for. */
const PAGE = `
  <button id="openSettings"></button>
  <p id="status"></p>
  <section id="tracks" hidden><select id="track"></select><select id="second"></select></section>
  <section id="capture" hidden><p id="captureText"></p><button id="captureGo" hidden></button></section>
  <section id="quick" hidden><button id="toggleSidebar"></button></section>
  <footer id="anki">Anki: checking…</footer>`;

function mount(): void {
  document.body.innerHTML = PAGE;
  vi.stubGlobal('chrome', {
    tabs: { query: async () => [], sendMessage: async () => undefined },
    runtime: {
      openOptionsPage: () => {},
      sendMessage: async (msg: { action: string }) => answers[msg.action] ?? { ok: false, kind: 'refused', error: 'unexpected' },
    },
    storage: { local: { get: async () => ({ ...local }) } },
  });
}

async function footer(): Promise<HTMLElement> {
  vi.resetModules();
  await import('../action');
  await vi.waitFor(() => {
    if (document.getElementById('anki')?.textContent === 'Anki: checking…') throw new Error('still checking');
  });
  return document.getElementById('anki') as HTMLElement;
}

beforeEach(() => {
  answers = {};
  local = {};
  mount();
});

describe('the Anki line', () => {
  it('names another program on the port instead of saying Anki is not running', async () => {
    answers.version = { ok: false, kind: 'occupied', error: 'Something on port 8765 answered with HTTP 501.' };
    const el = await footer();
    expect(el.textContent).toContain('Another program is using port 8765');
    expect(el.className).toBe('bad');
  });

  it('counts cards when connected', async () => {
    answers = {
      version: { ok: true, result: 6 },
      modelNames: { ok: true, result: ['Libregaku'] },
      modelFieldNames: {
        ok: true,
        result: ['Expression', 'Reading', 'Meaning', 'Sentence', 'SentenceMeaning', 'Source', 'Audio', 'Image'],
      },
      deckNames: { ok: true, result: ['Default'] },
      findCards: { ok: true, result: [1, 2, 3] },
    };
    const el = await footer();
    expect(el.textContent).toBe('Anki connected · 3 cards from Libregaku');
    expect(el.className).toBe('ok');
  });

  it('keeps "not running" for when nothing is listening', async () => {
    answers.version = { ok: false, kind: 'offline', offline: true };
    expect((await footer()).textContent).toBe('Anki not running — words show as new');
  });

  it('says how many cards are waiting for Anki to open', async () => {
    answers.version = { ok: false, kind: 'offline', offline: true };
    const waiting = (expression: string) => ({ card: { deck: 'Vocabulary', expression }, word: expression, at: 1 });
    local['libregaku.cards.pending.a'] = waiting('猫');
    local['libregaku.cards.pending.b'] = waiting('犬');
    expect((await footer()).textContent).toBe('Anki not running — words show as new · 2 cards waiting for Anki');
  });
});

describe('describeAnki', () => {
  it('has a distinct line for every state', async () => {
    const { describeAnki } = await import('../action');
    const states: AnkiState[] = [
      { kind: 'connected', decks: [], cards: 1, installed: 'present' },
      { kind: 'offline' },
      { kind: 'blocked' },
      { kind: 'occupied', detail: '' },
      { kind: 'busy', detail: '' },
      { kind: 'refused', detail: 'collection is not available' },
    ];
    const lines = states.map((s) => describeAnki(s).text);
    expect(new Set(lines).size).toBe(states.length);
    expect(lines[0]).toBe('Anki connected · 1 card from Libregaku');
    expect(lines[2]).toContain('refused this extension');
    expect(lines[5]).toBe('collection is not available');
  });
});

describe('the track pickers', () => {
  it("mark a generated track after the site's own name for it", async () => {
    document.body.innerHTML = PAGE;
    vi.stubGlobal('chrome', {
      tabs: {
        query: async () => [{ id: 5 }],
        sendMessage: async () => ({
          supported: true, site: 'youtube', title: 'x', rendering: true, sidebarOpen: true, track: 'a', second: null,
          tracks: [{ id: 'a', lang: 'ja', label: 'Japanese' }, { id: 'b', lang: 'ja', label: '', generated: true }],
        }),
      },
      runtime: { openOptionsPage: () => {}, sendMessage: async () => ({ ok: false, kind: 'offline', offline: true }) },
      storage: { local: { get: async () => ({}) } },
    });
    vi.resetModules();
    await import('../action');
    await vi.waitFor(() => {
      if (document.getElementById('tracks')?.hidden !== false) throw new Error('not yet');
    });
    const shown = (id: string): Array<string | null> =>
      Array.from(document.querySelectorAll(`#${id} option`)).map((o) => o.textContent);
    expect(shown('track')).toEqual(['Japanese', 'ja (auto)']);
    expect(shown('second')).toEqual(['None', 'Japanese', 'ja (auto)']);
  });

  it("leave out Netflix's forced tracks, unless one is in use", async () => {
    document.body.innerHTML = PAGE;
    vi.stubGlobal('chrome', {
      tabs: {
        query: async () => [{ id: 5 }],
        sendMessage: async () => ({
          supported: true, site: 'netflix', title: 'x', rendering: true, sidebarOpen: true, track: 'zh', second: 'f-en',
          tracks: [
            { id: 'zh', lang: 'zh-Hans', label: 'Chinese (Simplified)' },
            { id: 'f-zh', lang: 'zh-Hans', label: 'Off (forced)', forced: true },
            { id: 'f-en', lang: 'en', label: 'Off (forced)', forced: true },
            { id: 'en', lang: 'en', label: 'English' },
          ],
        }),
      },
      runtime: { openOptionsPage: () => {}, sendMessage: async () => ({ ok: false, kind: 'offline', offline: true }) },
      storage: { local: { get: async () => ({}) } },
    });
    vi.resetModules();
    await import('../action');
    await vi.waitFor(() => {
      if (document.getElementById('tracks')?.hidden !== false) throw new Error('not yet');
    });
    const shown = (id: string): Array<string | null> =>
      Array.from(document.querySelectorAll(`#${id} option`)).map((o) => o.textContent);
    expect(shown('track')).toEqual(['Chinese (Simplified)', 'English']);
    expect(shown('second')).toEqual(['None', 'Chinese (Simplified)', 'Off (forced)', 'English']);
  });
});

describe('sentence audio on a protected video', () => {
  /** The popup on a tab whose video cannot be recorded directly. */
  async function onProtectedTab(granted: boolean, capturing = false) {
    document.body.innerHTML = PAGE;
    const sent: unknown[] = [];
    const openOptionsPage = vi.fn();
    vi.stubGlobal('chrome', {
      tabs: {
        query: async () => [{ id: 5 }],
        sendMessage: async () => ({ supported: true, site: 'netflix', title: 'x', rendering: true, tracks: [], track: null, second: null, sidebarOpen: true, capture: 'tab', capturing }),
      },
      permissions: { contains: async () => granted },
      runtime: {
        openOptionsPage,
        sendMessage: async (msg: { type?: string; action?: string }) => {
          sent.push(msg);
          if (msg.type === 'tab-capture-start') return { ok: true };
          return { ok: false, kind: 'offline', offline: true };
        },
      },
      storage: { local: { get: async () => ({}) } },
    });
    vi.resetModules();
    await import('../action');
    await vi.waitFor(() => {
      if (document.getElementById('quick')?.hidden !== false) throw new Error('not yet');
      if (capturing) return;
      if (document.getElementById('capture')?.hidden !== false) throw new Error('not yet');
      if (!document.getElementById('captureText')?.textContent) throw new Error('not yet');
    });
    return { sent, openOptionsPage, text: () => document.getElementById('captureText')!.textContent, go: document.getElementById('captureGo') as HTMLButtonElement };
  }

  it('sends the learner to settings for the permission first', async () => {
    const { text, go, openOptionsPage } = await onProtectedTab(false);
    expect(text()).toMatch(/permission/);
    expect(go.textContent).toBe('Allow in settings');
    go.click();
    expect(openOptionsPage).toHaveBeenCalled();
  });

  it('starts capturing this tab from the button, once allowed', async () => {
    const { text, go, sent } = await onProtectedTab(true);
    expect(go.textContent).toBe('Record sentence audio here');
    go.click();
    // Once it records, there is nothing left to ask.
    await vi.waitFor(() => expect(document.getElementById('capture')!.hidden).toBe(true));
    expect(sent).toContainEqual({ type: 'tab-capture-start', tabId: 5 });
    expect(text()).not.toMatch(/Recording/);
  });

  it('shows nothing when the tab is already recording', async () => {
    await onProtectedTab(true, true);
    expect(document.getElementById('capture')!.hidden).toBe(true);
  });
});
