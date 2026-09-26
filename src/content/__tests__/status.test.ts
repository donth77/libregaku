import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Status, StatusMap } from '../../anki/status';

const api = vi.hoisted(() => ({
  buildStatusMap: vi.fn<() => Promise<StatusMap>>(),
  addNote: vi.fn<(card: Record<string, unknown>) => Promise<number>>(),
  navigate: () => {},
  /** The video's tracks, and what each one says — one Japanese track unless a test says otherwise. */
  tracks: [{ id: 'ja', lang: 'ja', label: 'Japanese' }] as Array<{ id: string; lang: string; label: string }>,
  cues: { ja: [{ start: 0, end: 10, text: '食べる' }] } as Record<string, Array<{ start: number; end: number; text: string }>>,
}));

vi.mock('../../anki/status', async (original) => ({
  ...await original<typeof import('../../anki/status')>(),
  buildStatusMap: api.buildStatusMap,
}));
vi.mock('../../anki/client', async (original) => ({
  ...await original<typeof import('../../anki/client')>(),
  ensureModel: async () => 'present',
  addNote: api.addNote,
}));
vi.mock('../../dict/client', async (original) => ({
  ...await original<typeof import('../../dict/client')>(),
  ensureDictionary: async () => ({ ready: true }),
  lookupToken: async () => ({ state: 'empty' }),
}));
vi.mock('../../morphology/lindera', () => ({
  LinderaSegmenter: class {
    tier = 2;
    hasLemma = true;
    static async status() { return { ready: true }; }
    static async ensure() { return { ok: true }; }
    segment(text: string) {
      return [{ surface: text, lemma: '食べる', start: 0, end: text.length, content: true }];
    }
  },
}));
vi.mock('../../adapters/youtube', () => ({
  YouTubeAdapter: class {
    id = 'youtube';
    domCaptions = { container: '.captions', segment: '.caption' };
    playerRoot = ['#movie_player'];
    matches() { return true; }
    video() { return document.querySelector('video'); }
    videoId() { return 'test'; }
    title() { return 'Test video'; }
    deepLink() { return 'https://www.youtube.com/watch?v=test'; }
    async listTracks() { return api.tracks; }
    async loadTrack(id: string) { return api.cues[id] ?? []; }
    hideNative() {}
    onNavigate(cb: () => void) { api.navigate = cb; }
    onTracks() {}
  },
}));
vi.mock('../../adapters/netflix', () => ({
  NetflixAdapter: class {
    matches() { return false; }
    onNavigate() {}
    onTracks() {}
  },
}));
vi.mock('../player-inset', () => ({ PlayerInset: class { set() {} destroy() {} } }));

let stored: Record<string, unknown>;
/** chrome.storage.local, where hand marks live. */
let local: Record<string, unknown>;
let listeners: MockInstance<Document['addEventListener']>;

function snapshot(status: Status): StatusMap {
  return { size: status === 'unknown' ? 0 : 1, get: () => status };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
const root = (selector: string): ShadowRoot => document.querySelector(selector)!.shadowRoot!;
const token = (): HTMLElement => root('.libregaku-root').querySelector('.t')!;
const summary = (): string => root('.libregaku-sidebar').querySelector('.summary')!.textContent ?? '';

async function openWord(): Promise<ShadowRoot> {
  token().click();
  await flush();
  return root('.libregaku-popup');
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  stored = { 'libregaku.settings': { deck: 'Mining' } };
  local = {};
  const read = (area: Record<string, unknown>) => async (keys: string | string[]) =>
    Object.fromEntries([keys].flat().map((k) => [k, area[k]]));
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: read(stored),
        set: async (patch: Record<string, unknown>) => { Object.assign(stored, patch); },
        remove: async (key: string) => { delete stored[key]; },
      },
      local: {
        get: read(local),
        set: async (patch: Record<string, unknown>) => { Object.assign(local, patch); },
      },
      onChanged: { addListener: () => {} },
    },
    runtime: { onMessage: { addListener: () => {} } },
  });
  api.tracks = [{ id: 'ja', lang: 'ja', label: 'Japanese' }];
  api.cues = { ja: [{ start: 0, end: 10, text: '食べる' }] };
  api.buildStatusMap.mockReset().mockResolvedValue(snapshot('unknown'));
  api.addNote.mockReset().mockResolvedValue(1);
  listeners = vi.spyOn(document, 'addEventListener');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  document.body.innerHTML = '<div id="movie_player"><video></video></div>';
  await import('../index');
  await flush();
});

afterEach(() => {
  api.navigate();
  for (const [type, listener, options] of listeners.mock.calls) {
    document.removeEventListener(type, listener, options);
  }
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('vocabulary status in the player', () => {
  it('shows a new card immediately, then follows Anki through maturity and deletion', async () => {
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
    let answer!: (value: StatusMap) => void;
    api.buildStatusMap.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb.add')!.click();
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(token().dataset.s).toBe('learning');
    expect(summary()).toContain('0 new');
    expect(local['libregaku.overrides']).toEqual({});

    answer(snapshot('known'));
    await flush();
    expect(token().dataset.s).toBe('known');

    // A later refresh can also report the note was removed from Anki.
    const { setSetting } = await import('../../settings');
    api.buildStatusMap.mockResolvedValue(snapshot('unknown'));
    await setSetting('statusScope', 'Japanese');
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
  });

  it('updates the current token and counts for manual marks, including during an Anki refresh', async () => {
    let answer!: (value: StatusMap) => void;
    api.buildStatusMap.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const { setSetting } = await import('../../settings');
    await setSetting('statusScope', 'Japanese');
    await flush();

    const anchor = token();
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.mk.known')!.click();
    await flush();
    expect(token()).toBe(anchor);
    expect(token().dataset.s).toBe('known');
    expect(summary()).toContain('100% known');

    answer(snapshot('unknown'));
    await flush();
    expect(token().dataset.s).toBe('known');
    expect(summary()).toContain('0 new');

    const reopened = await openWord();
    reopened.querySelector<HTMLButtonElement>('.mk.known')!.click();
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
  });

  it('ignores an older Anki response that arrives after the current refresh', async () => {
    let older!: (value: StatusMap) => void;
    api.buildStatusMap
      .mockReturnValueOnce(new Promise((resolve) => { older = resolve; }))
      .mockResolvedValueOnce(snapshot('known'));
    const { setSetting } = await import('../../settings');
    await setSetting('statusScope', 'Japanese');
    await flush();
    await setSetting('statusScope', 'Japanese::Mining');
    await flush();
    expect(token().dataset.s).toBe('known');
    older(snapshot('unknown'));
    await flush();
    expect(token().dataset.s).toBe('known');
    expect(summary()).toContain('100% known');
  });

  it('re-reads Anki when the status scope changes, and not for any other setting', async () => {
    const { setSetting } = await import('../../settings');
    const before = api.buildStatusMap.mock.calls.length;
    await setSetting('ruby', 'always');
    await setSetting('sidebarOpen', false);
    await flush();
    expect(api.buildStatusMap.mock.calls.length).toBe(before);
    await setSetting('statusScope', 'Japanese');
    await flush();
    expect(api.buildStatusMap.mock.calls.length).toBe(before + 1);
  });

  it('does not change vocabulary status when adding the card fails', async () => {
    api.addNote.mockRejectedValueOnce(new Error('Anki is closed'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb.add')!.click();
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
    // The first read migrates marks into local storage, so the key may exist;
    // what matters is that the failed add left no mark in it.
    expect(local['libregaku.overrides'] ?? {}).toEqual({});
  });
});

describe('a card mined from the player', () => {
  it("carries the line's translation, and links to where the line starts", async () => {
    // Reload with a second track, so the line on screen has a translation.
    api.navigate();
    api.tracks = [{ id: 'ja', lang: 'ja', label: 'Japanese' }, { id: 'en', lang: 'en', label: 'English' }];
    api.cues = {
      ja: [{ start: 0, end: 10, text: '食べる' }],
      en: [{ start: 0, end: 10, text: 'to eat' }],
    };
    await vi.advanceTimersByTimeAsync(700);
    const video = document.querySelector('video')!;
    Object.defineProperty(video, 'currentTime', { value: 7, configurable: true });

    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb.add')!.click();
    await flush();

    const card = api.addNote.mock.calls[0]?.[0] as Record<string, string> | undefined;
    expect(card?.sentenceMeaning).toBe('to eat');
    // The line starts at 0; the playhead being at 7 by the time Add was pressed
    // must not move the card's timestamp.
    expect(card?.source).toContain('Test video · 0:00');
    expect(card?.source).not.toContain('0:07');
  });
});
