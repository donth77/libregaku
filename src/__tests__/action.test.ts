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
  // A popup opened by an earlier test is closed: it would go on asking its page.
  window.dispatchEvent(new Event('pagehide'));
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

describe('the status line off a video', () => {
  const popupOn = async (url: string): Promise<string> => {
    document.body.innerHTML = PAGE;
    vi.stubGlobal('chrome', {
      tabs: {
        query: async () => [{ id: 5, url }],
        sendMessage: async () => ({ supported: false, site: null, title: null, rendering: false, tracks: [], track: null, second: null, sidebarOpen: false }),
      },
      runtime: { openOptionsPage: () => {}, sendMessage: async () => ({ ok: false, kind: 'offline', offline: true }) },
      storage: { local: { get: async () => ({}) } },
    });
    vi.resetModules();
    await import('../action');
    await vi.waitFor(() => {
      if (!document.getElementById('status')?.textContent) throw new Error('not yet');
    });
    return document.getElementById('status')!.textContent!;
  };

  it('names the site the tab is on, not all of them', async () => {
    expect(await popupOn('https://www.netflix.com/browse')).toBe('Libregaku works on Netflix.');
    expect(await popupOn('https://www.disneyplus.com/home')).toBe('Libregaku works on Disney+.');
    expect(await popupOn('https://play.hbomax.com/')).toBe('Libregaku works on HBO Max.');
    expect(await popupOn('https://tv.apple.com/us')).toBe('Libregaku works on Apple TV.');
  });

  it('lists the sites where the tab is on none of them', async () => {
    expect(await popupOn('https://example.com/')).toBe('Libregaku works on YouTube, Netflix, Disney+, Prime Video, HBO Max and Apple TV.');
  });

  it('knows each site by its address', async () => {
    const { siteOfUrl } = await import('../action');
    expect(siteOfUrl('https://www.youtube.com/watch?v=1')).toBe('youtube');
    expect(siteOfUrl('https://www.primevideo.com/detail/x')).toBe('prime');
    expect(siteOfUrl('https://tv.apple.com/us/show/pachinko/umc.cmc.1')).toBe('apple');
    // The rest of apple.com is not the service.
    expect(siteOfUrl('https://www.apple.com/apple-tv-plus/')).toBeNull();
    expect(siteOfUrl('https://notnetflix.com/')).toBeNull();
    expect(siteOfUrl(undefined)).toBeNull();
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
    // Subtitles: the language learned, which is not Chinese here, so only the track in use. Translation: the languages offered.
    expect(shown('track')).toEqual(['Chinese (Simplified)']);
    expect(shown('second')).toEqual(['None', 'Chinese (Simplified)', 'Off (forced)', 'English']);
  });
});

describe('the track pickers and the page', () => {
  type Track = { id: string; lang: string; label: string };
  const ja: Track = { id: 'ja', lang: 'ja', label: 'Japanese' };
  const hans: Track = { id: 'hans', lang: 'zh-Hans', label: 'Chinese (Simplified)' };
  const hant: Track = { id: 'hant', lang: 'zh-Hant', label: 'Chinese (Traditional)' };
  const en: Track = { id: 'en', lang: 'en', label: 'English' };

  /** What the page says of itself, which a test changes as the page would. */
  let page: { rendering: boolean; tracks: Track[]; track: string | null; second: string | null; notice?: string | null };
  /** True while the page has nothing of ours on it to answer: still loading, or not a site we read. */
  let absent = false;
  let sent: Array<Record<string, unknown>>;

  const shown = (id: string): Array<string | null> =>
    Array.from(document.querySelectorAll(`#${id} option`)).map((o) => o.textContent);
  const value = (id: string): string => (document.getElementById(id) as HTMLSelectElement).value;

  async function open(onPick?: (msg: Record<string, unknown>) => void, target = 'ja'): Promise<void> {
    sent = [];
    document.body.innerHTML = PAGE;
    vi.stubGlobal('chrome', {
      tabs: {
        query: async () => [{ id: 5 }],
        sendMessage: async (_tab: number, msg: Record<string, unknown>) => {
          if (msg.type === 'lg-state') {
            if (absent) throw new Error('Could not establish connection. Receiving end does not exist.');
            return { supported: true, site: 'netflix', title: 'x', sidebarOpen: true, ...page };
          }
          sent.push(msg);
          onPick?.(msg);
          return { ok: true };
        },
      },
      runtime: { openOptionsPage: () => {}, sendMessage: async () => ({ ok: false, kind: 'offline', offline: true }) },
      storage: { local: { get: async () => ({}) }, sync: { get: async () => ({ 'libregaku.settings': { target } }) } },
    });
    vi.resetModules();
    await import('../action');
    await vi.waitFor(() => {
      if (document.getElementById('status')?.textContent === '') throw new Error('not yet');
    });
  }

  const pick = (id: string, to: string): void => {
    const sel = document.getElementById(id) as HTMLSelectElement;
    sel.value = to;
    sel.dispatchEvent(new Event('change'));
  };

  it('show nothing chosen, not an empty box, when the video has none in the language learned', async () => {
    // Learning Japanese on a video with Chinese and English only: nothing is loaded, and Subtitles offers nothing.
    page = { rendering: true, tracks: [hans, en], track: null, second: null };
    await open();
    expect(shown('track')).toEqual(['—']);
    expect(value('track')).toBe('');
    expect((document.querySelector('#track option') as HTMLOptionElement).disabled).toBe(true);
    // The translation's list has its own first choice for that.
    expect(shown('second')).toEqual(['None', 'Chinese (Simplified)', 'English']);
  });

  it('are drawn again from the page after a pick, which can move the other list too', async () => {
    page = { rendering: true, tracks: [hans, hant, en], track: 'hans', second: 'en' };
    await open((msg) => {
      // The page loads the pick; the subtitles' track cannot also be the translation's.
      if (typeof msg.track === 'string') page = { ...page, track: msg.track, second: msg.track === 'en' ? null : page.second };
    }, 'zh');
    expect(shown('track')).toEqual(['Chinese (Simplified)', 'Chinese (Traditional)']);
    expect([value('track'), value('second')]).toEqual(['hans', 'en']);

    pick('track', 'hant');
    await vi.waitFor(() => expect(sent).toEqual([{ type: 'lg-set-tracks', track: 'hant' }]));
    await vi.waitFor(() => expect([value('track'), value('second')]).toEqual(['hant', 'en']));

    // The page can still be moved to a track Subtitles does not list; the one in use is then listed.
    page = { ...page, track: 'en', second: null };
    pick('track', 'hans');
    await vi.waitFor(() => expect(sent.at(-1)).toEqual({ type: 'lg-set-tracks', track: 'hans' }));
  });

  it('follow a page that had not finished loading when the popup opened', async () => {
    vi.useFakeTimers();
    try {
      absent = true;
      page = { rendering: true, tracks: [ja, en], track: 'ja', second: 'en' };
      await open();
      expect(document.getElementById('status')?.textContent).toContain('Not active on this page');
      expect(document.getElementById('tracks')?.hidden).toBe(true);
      expect(document.getElementById('quick')?.hidden).toBe(true);

      // The page's own script is in: lists, status and the panel's button all arrive.
      absent = false;
      await vi.advanceTimersByTimeAsync(1100);
      expect(document.getElementById('status')?.textContent).toContain('Active');
      expect(document.getElementById('tracks')?.hidden).toBe(false);
      expect(document.getElementById('quick')?.hidden).toBe(false);
      expect([value('track'), value('second')]).toEqual(['ja', 'en']);

      // And go again if the tab moves on to a page with nothing of ours.
      absent = true;
      await vi.advanceTimersByTimeAsync(1100);
      expect(document.getElementById('tracks')?.hidden).toBe(true);
      expect(document.getElementById('quick')?.hidden).toBe(true);
    } finally {
      absent = false;
      window.dispatchEvent(new Event('pagehide'));
      vi.useRealTimers();
    }
  });

  it('come with what the page says, in place of "active", when no track is in use', async () => {
    const said = "The player hasn't loaded these subtitles yet.";
    page = { rendering: true, tracks: [ja, hans, en], track: null, second: null, notice: said };
    await open();
    const status = document.getElementById('status') as HTMLElement;
    expect(status.textContent).toBe(said);
    expect(status.className).toBe('status off');
    expect(value('track')).toBe('');

    // A notice beside subtitles that are showing is about something else: the page is active.
    window.dispatchEvent(new Event('pagehide'));
    page = { rendering: true, tracks: [ja, en], track: 'ja', second: null, notice: 'This video has only one subtitle track, so there is no second line.' };
    await open();
    expect(document.getElementById('status')?.textContent).toContain('Active');
    expect(document.getElementById('status')?.className).toBe('status ok');
  });

  it('show nothing in use when the pick could not be loaded', async () => {
    // Asked for a track the player would not hand over: the page loads nothing, and says so.
    page = { rendering: true, tracks: [ja, hans, en], track: 'ja', second: 'en' };
    await open((msg) => {
      if (msg.track === 'hans') page = { ...page, track: null, second: null };
    }, 'zh');
    pick('track', 'hans');
    await vi.waitFor(() => expect(sent).toEqual([{ type: 'lg-set-tracks', track: 'hans' }]));
    await vi.waitFor(() => expect(shown('track')).toEqual(['—', 'Chinese (Simplified)']));
    expect([value('track'), value('second')]).toEqual(['', '']);
  });

  it('follow the page while it starts over for another language', async () => {
    vi.useFakeTimers();
    try {
      // Opened a moment after the language was changed: the page is starting over.
      page = { rendering: false, tracks: [ja, hans, hant, en], track: null, second: null };
      await open(undefined, 'zh');
      expect(document.getElementById('status')?.textContent).toContain('Waiting for subtitles');
      expect(value('track')).toBe('');

      page = { rendering: true, tracks: [ja, hans, hant, en], track: 'hans', second: 'en' };
      await vi.advanceTimersByTimeAsync(1100);
      expect(document.getElementById('status')?.textContent).toContain('Active');
      expect([value('track'), value('second')]).toEqual(['hans', 'en']);
      // The placeholder goes once a track is in use.
      expect(shown('track')).toEqual(['Chinese (Simplified)', 'Chinese (Traditional)']);

      // Closed: it stops asking.
      window.dispatchEvent(new Event('pagehide'));
      page = { ...page, track: 'hant' };
      await vi.advanceTimersByTimeAsync(3000);
      expect(value('track')).toBe('hans');
    } finally {
      vi.useRealTimers();
    }
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
