import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Status, StatusMap } from '../../anki/status';

const api = vi.hoisted(() => ({
  buildStatusMap: vi.fn<() => Promise<StatusMap>>(),
  addNote: vi.fn<() => Promise<number>>(),
  navigate: () => {},
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
  lookupWord: async () => ({ state: 'empty' }),
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
    async listTracks() { return [{ id: 'ja', lang: 'ja', label: 'Japanese' }]; }
    async loadTrack() { return [{ start: 0, end: 10, text: '食べる' }]; }
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
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: async (key: string) => ({ [key]: stored[key] }),
        set: async (patch: Record<string, unknown>) => { Object.assign(stored, patch); },
      },
      local: { get: async () => ({}), set: async () => {} },
      onChanged: { addListener: () => {} },
    },
    runtime: { onMessage: { addListener: () => {} } },
  });
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
    expect(stored['libregaku.overrides']).toEqual({});

    answer(snapshot('known'));
    await flush();
    expect(token().dataset.s).toBe('known');

    // A later refresh can also report the note was removed from Anki.
    const { setSetting } = await import('../../settings');
    api.buildStatusMap.mockResolvedValue(snapshot('unknown'));
    await setSetting('ruby', 'always');
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
  });

  it('updates the current token and counts for manual marks, including during an Anki refresh', async () => {
    let answer!: (value: StatusMap) => void;
    api.buildStatusMap.mockReturnValueOnce(new Promise((resolve) => { answer = resolve; }));
    const { setSetting } = await import('../../settings');
    await setSetting('ruby', 'always');
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
    await setSetting('ruby', 'always');
    await flush();
    await setSetting('ruby', 'never');
    await flush();
    expect(token().dataset.s).toBe('known');
    older(snapshot('unknown'));
    await flush();
    expect(token().dataset.s).toBe('known');
    expect(summary()).toContain('100% known');
  });

  it('does not change vocabulary status when adding the card fails', async () => {
    api.addNote.mockRejectedValueOnce(new Error('Anki is closed'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb.add')!.click();
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
    expect(stored['libregaku.overrides']).toBeUndefined();
  });
});
