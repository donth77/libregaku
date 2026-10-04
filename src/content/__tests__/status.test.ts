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
        // null asks for everything, as the waiting-card queue does.
        get: async (keys: string | string[] | null) => (keys === null ? { ...local } : read(local)(keys)),
        set: async (patch: Record<string, unknown>) => { Object.assign(local, patch); },
        remove: async (keys: string | string[]) => { for (const k of [keys].flat()) delete local[k]; },
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

/** A key pressed on the page, as the browser would send it. */
function key(k: string, more: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...more });
  document.body.dispatchEvent(e);
  return e;
}

/** The message the player is showing for a key, if any. */
const flashed = (): string => document.querySelector('.libregaku-flash')?.shadowRoot?.textContent ?? '';

/** Load a video with these lines, a clock the test sets, and a player on screen. */
async function lines(texts: Array<[number, number, string]>): Promise<{ clock: { now: number }; play: ReturnType<typeof vi.fn> }> {
  api.navigate();
  api.cues = { ja: texts.map(([start, end, text]) => ({ start, end, text })) };
  await vi.advanceTimersByTimeAsync(700);
  const clock = { now: 0 };
  const video = document.querySelector('video')!;
  Object.defineProperty(video, 'currentTime', { get: () => clock.now, set: (t: number) => { clock.now = t; }, configurable: true });
  const play = vi.fn(async () => {});
  video.play = play;
  const player = document.querySelector<HTMLElement>('#movie_player')!;
  player.getBoundingClientRect = () => ({ top: 0, bottom: 400, height: 400, left: 0, right: 700, width: 700, x: 0, y: 0, toJSON: () => ({}) });
  return { clock, play };
}

describe('keys in the player', () => {
  it('moves a line at a time with the arrows, and plays the line it lands on', async () => {
    const { clock, play } = await lines([[0, 2, '食べる'], [3, 5, '飲む'], [6, 8, '寝る']]);
    clock.now = 1;
    const e = key('ArrowRight');
    expect(e.defaultPrevented).toBe(true);
    expect(clock.now).toBe(3);
    expect(play).toHaveBeenCalled();

    clock.now = 4;
    key('ArrowDown');
    expect(clock.now).toBe(3);
    clock.now = 4;
    key('ArrowLeft');
    expect(clock.now).toBe(0);
  });

  it('steps on from where it sent playback, even before the player gets there', async () => {
    await lines([[0, 2, '食べる'], [3, 5, '飲む'], [6, 8, '寝る']]);
    // A player that takes its time: the seek has not landed when the next key comes.
    const seeks: number[] = [];
    const video = document.querySelector('video')!;
    Object.defineProperty(video, 'currentTime', { get: () => 1, set: (t: number) => { seeks.push(t); }, configurable: true });
    key('ArrowRight');
    key('ArrowRight');
    expect(seeks).toEqual([3, 6]);
  });

  it('leaves the arrows to the page when typing, with shift, or with the player scrolled away', async () => {
    const { clock } = await lines([[0, 2, '食べる'], [3, 5, '飲む']]);
    clock.now = 1;
    const input = document.createElement('input');
    document.body.appendChild(input);
    const typed = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    input.dispatchEvent(typed);
    expect(typed.defaultPrevented).toBe(false);
    expect(key('ArrowRight', { shiftKey: true }).defaultPrevented).toBe(false);
    document.querySelector<HTMLElement>('#movie_player')!.getBoundingClientRect = () =>
      ({ top: -900, bottom: -500, height: 400, left: 0, right: 700, width: 700, x: 0, y: -900, toJSON: () => ({}) });
    expect(key('ArrowRight').defaultPrevented).toBe(false);
    expect(clock.now).toBe(1);
  });

  it('steps furigana and the second line, and says what it did', async () => {
    await lines([[0, 2, '食べる']]);
    key('r');
    expect((stored['libregaku.settings'] as Record<string, unknown>).ruby).toBe('always');
    expect(flashed()).toContain('Furigana: always');
    key('ArrowUp');
    expect((stored['libregaku.settings'] as Record<string, unknown>).dualSubtitles).toBe(false);
    expect(flashed()).toContain('Second line off');
  });

  it("adds the open card's word with A, through the card", async () => {
    const popup = await openWord();
    key('a');
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(popup.querySelector('.toast')?.textContent).toContain('added to Mining');
  });

  it('adds the last word looked up once its card has closed, and says so', async () => {
    await openWord();
    key('Escape');
    expect(document.querySelector('.libregaku-popup')).toBeNull();
    key('a');
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(flashed()).toContain('食べる · added to Mining');
  });

  it('asks for a word first when nothing has been looked up', async () => {
    key('a');
    await flush();
    expect(api.addNote).not.toHaveBeenCalled();
    expect(flashed()).toContain('Look a word up first');
  });

  it("marks the open card's word known with K, and leaves K to YouTube otherwise", async () => {
    // No card open: K is YouTube's play/pause.
    expect(key('k').defaultPrevented).toBe(false);
    await openWord();
    expect(key('k').defaultPrevented).toBe(true);
    await flush();
    expect(token().dataset.s).toBe('known');
    expect(document.querySelector('.libregaku-popup')).toBeNull();
    expect(flashed()).toContain('marked known');
  });
});

describe('a card made while Anki is closed', () => {
  it('waits in the browser, shows as on its way, and goes in when Anki answers', async () => {
    const { AnkiUnavailable } = await import('../../anki/rpc');
    api.addNote.mockRejectedValueOnce(new AnkiUnavailable('Nothing is listening on port 8765.'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb.add')!.click();
    await flush();
    await flush();

    const waiting = Object.keys(local).filter((k) => k.startsWith('libregaku.cards.pending.'));
    expect(waiting).toHaveLength(1);
    expect(popup.querySelector('.toast')?.textContent).toContain('goes to Mining when it opens');
    expect(token().dataset.s).toBe('learning');
    expect(summary()).toContain('0 new');

    // Anki opens: it answers, and the next read of word status sends the card.
    vi.stubGlobal('chrome', {
      ...(globalThis as unknown as { chrome: object }).chrome,
      runtime: {
        onMessage: { addListener: () => {} },
        sendMessage: async (msg: { type?: string; action?: string }) => {
          if (msg.type === 'anki' && msg.action === 'version') return { ok: true, result: 6 };
          if (msg.type === 'anki' && msg.action === 'createDeck') return { ok: true, result: 1 };
          return { ok: false, kind: 'offline', offline: true };
        },
      },
    });
    api.buildStatusMap.mockResolvedValue(snapshot('learning'));
    const { setSetting } = await import('../../settings');
    await setSetting('statusScope', 'Japanese');
    await vi.advanceTimersByTimeAsync(7000);

    expect(api.addNote).toHaveBeenCalledTimes(2);
    expect((api.addNote.mock.calls[1]?.[0] as Record<string, unknown>).expression).toBe('食べる');
    expect(Object.keys(local).filter((k) => k.startsWith('libregaku.cards.pending.'))).toEqual([]);
    expect(token().dataset.s).toBe('learning');
  });
});
