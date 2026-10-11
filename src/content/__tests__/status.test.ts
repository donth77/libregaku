import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Status, StatusMap } from '../../anki/status';

const api = vi.hoisted(() => ({
  buildStatusMap: vi.fn<() => Promise<StatusMap>>(),
  addNote: vi.fn<(card: Record<string, unknown>) => Promise<number>>(),
  takeBack: vi.fn<(id: number) => Promise<void>>(),
  createDeck: vi.fn<(name: string) => Promise<void>>(),
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
  takeBack: api.takeBack,
  createDeck: api.createDeck,
}));
vi.mock('../../dict/client', async (original) => ({
  ...await original<typeof import('../../dict/client')>(),
  ensureDictionary: async () => ({ ready: true }),
  lookupToken: async () => ({ state: 'empty' }),
}));
vi.mock('../../morphology/analyser', async (original) => ({
  ...await original<typeof import('../../morphology/analyser')>(),
  ensureAnalyser: async () => ({ ok: true }),
}));
vi.mock('../../morphology/lindera', () => ({
  LinderaSegmenter: class {
    tier = 2;
    hasLemma = true;
    static async status() { return { ready: true }; }
    static async ensure() { return { ok: true }; }
    ruby(surface: string) { return [{ text: surface }]; }
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
/** The video's sound and pictures, as far as a test lets them be had. */
const cap = vi.hoisted(() => ({
  record: false,
  encrypted: false,
  starts: 0,
  recorded: null as { data: string; type: string } | null,
  still: null as { data: string; type: string } | null,
}));
vi.mock('../capture', async (original) => ({
  ...await original<typeof import('../capture')>(),
  isEncrypted: () => cap.encrypted,
  elementRecorder: () => (cap.record && !cap.encrypted
    ? { start: async () => { cap.starts++; }, stop: async () => cap.recorded, dispose: () => {} }
    : null),
  tabCaptured: async () => false,
  stillOf: async () => (cap.encrypted ? null : cap.still),
}));

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
  stored = { 'libregaku.settings': { deck: 'Vocabulary' } };
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
  api.takeBack.mockReset().mockResolvedValue(undefined);
  api.createDeck.mockReset().mockResolvedValue(undefined);
  Object.assign(cap, { record: false, encrypted: false, starts: 0, recorded: null, still: null });
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
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(token().dataset.s).toBe('learning');
    expect(summary()).toContain('0 new');
    expect(local['libregaku.marks.byLanguage']).toEqual({});
    // Into the deck chosen, which is never made on the learner's behalf.
    expect(api.createDeck).not.toHaveBeenCalled();

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
    await setSetting('statusScope', 'Japanese::Netflix');
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
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await flush();
    expect(token().dataset.s).toBe('unknown');
    expect(summary()).toContain('1 new');
    // The first read stores the marks by language, so the key may exist;
    // what matters is that the failed add left no mark in it.
    expect(local['libregaku.marks.byLanguage'] ?? {}).toEqual({});
  });
});

describe('a card made from the player', () => {
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
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
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
    expect(flashed()).toContain('Furigana: all');
    key('ArrowUp');
    expect((stored['libregaku.settings'] as Record<string, unknown>).dualSubtitles).toBe(false);
    expect(flashed()).toContain('Translation off');
  });

  it('blurs the subtitle until hovered with H, and says so', async () => {
    await lines([[0, 2, '食べる']]);
    const wrap = () => root('.libregaku-root').querySelector('.wrap')!;
    expect(wrap().classList.contains('blurred')).toBe(false);
    key('h');
    await flush();
    expect(wrap().classList.contains('blurred')).toBe(true);
    expect(flashed()).toContain('blurred until you hover');
    key('h');
    await flush();
    expect(wrap().classList.contains('blurred')).toBe(false);
  });

  it("adds the open card's word with A, through the card", async () => {
    const popup = await openWord();
    key('a');
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(popup.querySelector('.toast')?.textContent).toContain('added to Vocabulary');
  });

  it('adds the last word looked up once its card has closed, and says so', async () => {
    await openWord();
    key('Escape');
    expect(document.querySelector('.libregaku-popup')).toBeNull();
    key('a');
    await flush();
    expect(api.addNote).toHaveBeenCalledOnce();
    expect(flashed()).toContain('食べる · added to Vocabulary');
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
    // Anki is not answering here, so the mark waits in the browser and says so.
    expect(flashed()).toContain('食べる · marked known, no card');
  });
});

describe('the transcript button', () => {
  it('shows the transcript when the panel is on settings, and closes it only from the transcript', async () => {
    await lines([[0, 2, '食べる']]);
    const bar = root('#libregaku-header');
    const panel = (): HTMLElement => root('.libregaku-sidebar').querySelector<HTMLElement>('.panel')!;
    // The view showing: a list's tab, or the title of one that is not a list.
    const title = (): string => {
      const r = root('.libregaku-sidebar');
      const t = r.querySelector<HTMLElement>('.viewtitle');
      return t && !t.hidden ? t.textContent ?? '' : r.querySelector('[role=tab][aria-selected="true"] span')?.textContent ?? '';
    };
    bar.querySelector<HTMLButtonElement>('button[aria-label="Settings"]')!.click();
    expect(title()).toBe('Settings');
    bar.querySelector<HTMLButtonElement>('button[aria-keyshortcuts="S"]')!.click();
    expect(panel().style.display).not.toBe('none');
    expect(title()).toBe('Transcript');
    bar.querySelector<HTMLButtonElement>('button[aria-keyshortcuts="S"]')!.click();
    expect(panel().style.display).toBe('none');
  });

  it('opens on the transcript, whatever view the panel was closed on', async () => {
    await lines([[0, 2, '食べる']]);
    const bar = root('#libregaku-header');
    const side = root('.libregaku-sidebar');
    const panel = (): HTMLElement => side.querySelector<HTMLElement>('.panel')!;
    const selected = (): string | null | undefined => side.querySelector('[role=tab][aria-selected="true"]')?.getAttribute('data-mode');
    // Closed while showing Saved, from the panel's own close button.
    side.querySelector<HTMLButtonElement>('[role=tab][data-mode="saved"]')!.click();
    side.querySelector<HTMLButtonElement>('button[aria-label="Close the panel"]')!.click();
    expect(panel().style.display).toBe('none');

    bar.querySelector<HTMLButtonElement>('button[aria-keyshortcuts="S"]')!.click();
    expect(panel().style.display).not.toBe('none');
    expect(selected()).toBe('transcript');

    // The same from the panel's tab at the player's edge.
    side.querySelector<HTMLButtonElement>('[role=tab][data-mode="saved"]')!.click();
    side.querySelector<HTMLButtonElement>('button[aria-label="Close the panel"]')!.click();
    side.querySelector<HTMLButtonElement>('button.tab')!.click();
    expect(panel().style.display).not.toBe('none');
    expect(selected()).toBe('transcript');
  });
});

describe('taking a card back', () => {
  it('undoes a card just added: out of Anki, and the word new again', async () => {
    api.addNote.mockResolvedValue(1791680000000);
    const popup = await openWord();
    // Anki has the card once it is added…
    api.buildStatusMap.mockResolvedValue(snapshot('learning'));
    const add = popup.querySelector<HTMLButtonElement>('button.add')!;
    add.click();
    await flush();
    await flush();
    expect(token().dataset.s).toBe('learning');
    expect(add.dataset.tip).toBe('Undo');

    // …and not once it is taken back out.
    api.buildStatusMap.mockResolvedValue(snapshot('unknown'));
    await vi.advanceTimersByTimeAsync(1000);
    add.click();
    await flush();
    await flush();
    expect(api.takeBack).toHaveBeenCalledWith(1791680000000);
    expect(popup.querySelector('.toast')?.textContent).toBe('taken back out of Vocabulary');
    expect(token().dataset.s).toBe('unknown');
  });
});

describe('K on a word Anki already knows', () => {
  it('says so, and makes no mark', async () => {
    api.buildStatusMap.mockResolvedValue(snapshot('known'));
    const { setSetting } = await import('../../settings');
    await setSetting('statusScope', 'Japanese');
    await flush();
    await flush();
    expect(token().dataset.s).toBe('known');
    const card = await openWord();
    // Known from its cards: the button is not pressed, because no mark is there.
    expect(card.querySelector('.mk.known')?.getAttribute('aria-pressed')).toBe('false');
    key('k');
    await flush();
    expect(flashed()).toContain('食べる · already known in Anki');
    expect(JSON.stringify(local['libregaku.marks.byLanguage'] ?? {})).not.toContain('食べる');
    expect(JSON.stringify(local['libregaku.marks.pending.byLanguage'] ?? {})).not.toContain('食べる');
    expect(token().dataset.s).toBe('known');
  });
});

describe('each language keeps its own', () => {
  /** How many words the panel's Saved tab lists as known. */
  const marked = async (): Promise<string> => {
    const panel = root('.libregaku-sidebar');
    panel.querySelector<HTMLButtonElement>('[role=tab][data-mode="saved"]')?.click();
    await flush();
    return panel.querySelector('.wchip[data-show="known"] .n')?.textContent ?? '';
  };

  it('shows a mark only while the language it was made in is being learned', async () => {
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.mk.known')!.click();
    await flush();
    expect(token().dataset.s).toBe('known');
    expect(await marked()).toBe('1');
    expect(local['libregaku.marks.byLanguage']).toEqual({ ja: { 食べる: 'known' } });

    // French, on a video that has it: its lists start empty, and Japanese's mark is none of its business.
    api.tracks = [...api.tracks, { id: 'fr', lang: 'fr', label: 'French' }];
    api.cues = { ...api.cues, fr: [{ start: 0, end: 10, text: 'chat' }] };
    const { setSetting } = await import('../../settings');
    await setSetting('target', 'fr');
    await vi.advanceTimersByTimeAsync(1500);
    expect(token().textContent).toBe('chat');
    expect(await marked()).toBe('');
    expect(token().dataset.s).toBe('unknown');

    // And back: the mark was Japanese's all along.
    await setSetting('target', 'ja');
    await vi.advanceTimersByTimeAsync(1500);
    expect(await marked()).toBe('1');
    expect(token().dataset.s).toBe('known');
    expect(local['libregaku.marks.byLanguage']).toEqual({ ja: { 食べる: 'known' } });
  });

  it("sends a card to the language's own deck when none was chosen, and makes that deck first", async () => {
    const { setSetting } = await import('../../settings');
    await setSetting('deck', '');
    await flush();
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await flush();
    await flush();
    expect(api.createDeck).toHaveBeenCalledWith('Libregaku-JA');
    expect(api.createDeck.mock.invocationCallOrder[0]).toBeLessThan(api.addNote.mock.invocationCallOrder[0]!);
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.deck).toBe('Libregaku-JA');
    expect(card.tags).toContain('libregaku::lang::ja');
    expect(popup.querySelector('.toast')?.textContent).toBe('added to Libregaku-JA');
  });

  it("keeps a card for the language's own deck while Anki is closed, as for any deck", async () => {
    const { AnkiUnavailable } = await import('../../anki/rpc');
    api.createDeck.mockRejectedValueOnce(new AnkiUnavailable('Nothing is listening on port 8765.'));
    const { setSetting } = await import('../../settings');
    await setSetting('deck', '');
    await flush();
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await flush();
    await flush();
    expect(api.addNote).not.toHaveBeenCalled();
    const waiting = Object.entries(local).filter(([k]) => k.startsWith('libregaku.cards.pending.'));
    expect(waiting).toHaveLength(1);
    expect((waiting[0]?.[1] as { card: { deck: string } }).card.deck).toBe('Libregaku-JA');
    expect(popup.querySelector('.toast')?.textContent).toContain('goes to Libregaku-JA when it opens');
  });
});

describe('what a mark says it did', () => {
  it('says what happened to the word, that no card was made, and where tracked words are', async () => {
    const { markSaid } = await import('../index');
    expect(markSaid('食べる', 'known', { marks: new Map(), error: undefined } as never)).toBe('食べる · marked known, no card');
    expect(markSaid('食べる', 'tracking', null)).toBe('食べる · tracked, no card. See Saved in the panel');
    expect(markSaid('食べる', 'ignored', 'here')).toBe('食べる · ignored, no card');
    expect(markSaid('食べる', 'ignored', { marks: new Map(), error: 'refused' } as never))
      .toBe('食べる · ignored, no card — Anki refused it; trying again later');
    expect(markSaid('食べる', null, null)).toBe('食べる · mark taken off');
  });
});

describe('cards that open on Shift', () => {
  it('opens a word only with Shift held, or when Shift is pressed over it', async () => {
    const { setSetting } = await import('../../settings');
    await setSetting('interaction', 'shift');
    await lines([[0, 2, '食べる']]);
    const word = token();
    word.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(600);
    expect(document.querySelector('.libregaku-popup')).toBeNull();

    // The cursor is resting on it: pressing Shift opens it there.
    key('Shift', { shiftKey: true });
    await flush();
    expect(document.querySelector('.libregaku-popup')).not.toBeNull();
    // Shift is not a player key, and is never kept from the page.
    expect(key('Shift', { shiftKey: true }).defaultPrevented).toBe(false);
  });

  it('opens at once when the cursor arrives with Shift already held', async () => {
    const { setSetting } = await import('../../settings');
    await setSetting('interaction', 'shift');
    await lines([[0, 2, '食べる']]);
    token().dispatchEvent(new MouseEvent('mouseover', { bubbles: true, shiftKey: true }));
    await vi.advanceTimersByTimeAsync(0);
    await flush();
    expect(document.querySelector('.libregaku-popup')).not.toBeNull();
  });

  it('leaves Shift alone when cards open on hover', async () => {
    await lines([[0, 2, '食べる']]);
    token().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(50);
    key('Shift', { shiftKey: true });
    await flush();
    // Still the grace period's to decide.
    expect(document.querySelector('.libregaku-popup')).toBeNull();
  });
});

describe('selecting a phrase', () => {
  it('cancels a card hovering was about to open, once a word is pressed', async () => {
    await lines([[0, 2, '食べる']]);
    const word = token();
    word.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    word.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector('.libregaku-popup')).toBeNull();
  });
});

describe('the word elsewhere in the video', () => {
  it("lists the word's other lines on its card, and plays from one", async () => {
    const { clock, play } = await lines([[0, 2, '食べる'], [3, 5, '食べた'], [6, 8, '食べよう']]);
    clock.now = 1;
    const popup = await openWord();
    await flush();
    popup.querySelector<HTMLButtonElement>('.also-fold .fold-head')!.click();
    const rows = Array.from(popup.querySelectorAll('.also-line'));
    // The analyser stand-in reads every line as 食べる, so both others count.
    expect(rows.map((r) => r.querySelector('.at')?.textContent)).toEqual(['0:03', '0:06']);
    (rows[1] as HTMLButtonElement).click();
    expect(clock.now).toBe(6);
    expect(play).toHaveBeenCalled();
  });
});

describe("the word's other lines, switched off", () => {
  it('leaves them off the card', async () => {
    const { setSetting } = await import('../../settings');
    await setSetting('lookupElsewhere', false);
    await lines([[0, 2, '食べる'], [3, 5, '食べた']]);
    const popup = await openWord();
    await flush();
    expect(popup.querySelector('.also')).toBeNull();
  });
});

describe('a card made while Anki is closed', () => {
  it('waits in the browser, shows as on its way, and goes in when Anki answers', async () => {
    const { AnkiUnavailable } = await import('../../anki/rpc');
    api.addNote.mockRejectedValueOnce(new AnkiUnavailable('Nothing is listening on port 8765.'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await flush();
    await flush();

    const waiting = Object.keys(local).filter((k) => k.startsWith('libregaku.cards.pending.'));
    expect(waiting).toHaveLength(1);
    expect(popup.querySelector('.toast')?.textContent).toContain('goes to Vocabulary when it opens');
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

describe('a card with the line on it', () => {
  /** A player that plays: seeking lands at once, and playing moves the clock on. */
  async function player(texts: Array<[number, number, string]>, at: number) {
    const { clock, play } = await lines(texts);
    const video = document.querySelector('video')!;
    let playing = false;
    play.mockImplementation(async () => { playing = true; });
    video.pause = vi.fn(() => { playing = false; });
    Object.defineProperty(video, 'paused', { get: () => !playing, configurable: true });
    Object.defineProperty(video, 'currentTime', {
      get: () => clock.now,
      set: (t: number) => { clock.now = t; queueMicrotask(() => video.dispatchEvent(new Event('seeked'))); },
      configurable: true,
    });
    const ticking = setInterval(() => { if (playing) clock.now = Math.round((clock.now + 0.1) * 100) / 100; }, 100);
    clock.now = at;
    await vi.advanceTimersByTimeAsync(50);   // the line on screen catches up
    return { clock, isPlaying: () => playing, setPlaying: (on: boolean) => { playing = on; }, stop: () => clearInterval(ticking) };
  }

  it('replays the line to record it, takes a still, and puts playback back as it was', async () => {
    Object.assign(cap, { record: true, recorded: { data: 'TElORQ==', type: 'audio/mp4;codecs=mp4a.40.2' }, still: { data: 'SU1H', type: 'image/jpeg' } });
    const p = await player([[0, 2, '食べる'], [3, 5, '飲む']], 3.5);
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await vi.advanceTimersByTimeAsync(4000);
    p.stop();

    expect(cap.starts).toBe(1);
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.sentenceAudio).toEqual({ data: 'TElORQ==', filename: 'libregaku_test_3000.m4a' });
    expect(card.picture).toEqual({ data: 'SU1H', filename: 'libregaku_test_3000.jpg' });
    expect(p.clock.now).toBe(3.5);
    expect(p.isPlaying()).toBe(false);
    expect(popup.querySelector('.toast')?.textContent).toBe('added to Vocabulary');
  });

  it('keeps no sound from a replay someone interrupted, and says so', async () => {
    Object.assign(cap, { record: true, recorded: { data: 'TElORQ==', type: 'audio/mp4;codecs=mp4a.40.2' } });
    const p = await player([[0, 2, '食べる'], [3, 5, '飲む']], 3.5);
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await vi.advanceTimersByTimeAsync(700);
    p.setPlaying(false);   // paused by hand, mid-line
    await vi.advanceTimersByTimeAsync(4000);
    p.stop();
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.sentenceAudio).toBeNull();
    expect(popup.querySelector('.toast')?.textContent).toBe('added to Vocabulary — without sentence audio');
  });

  it('says to click the icon where the video is protected, and takes no still there', async () => {
    Object.assign(cap, { record: true, encrypted: true, still: { data: 'SU1H', type: 'image/jpeg' } });
    const p = await player([[0, 2, '食べる']], 1);
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await vi.advanceTimersByTimeAsync(100);
    p.stop();
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.sentenceAudio).toBeNull();
    expect(card.picture).toBeNull();
    expect(popup.querySelector('.toast')?.textContent).toContain('click the Libregaku icon to record here');
  });

  it("makes a card of the whole line from the card's line button, its sound on the front", async () => {
    Object.assign(cap, { record: true, recorded: { data: 'TElORQ==', type: 'audio/mp4;codecs=mp4a.40.2' }, still: { data: 'SU1H', type: 'image/jpeg' } });
    const p = await player([[0, 2, '食べる'], [3, 5, '飲む']], 3.5);
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb[aria-label="Add sentence"]')!.click();
    await vi.advanceTimersByTimeAsync(4000);
    p.stop();

    expect(api.addNote).toHaveBeenCalledOnce();
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.expression).toBe('飲む');
    expect(card.deck).toBe('Vocabulary');
    expect(card.tags).toContain('libregaku::sentence');
    expect(card.audio).toEqual({ data: 'TElORQ==', filename: 'libregaku_test_3000.m4a' });
    expect(card.sentenceAudio).toBeUndefined();
    expect(card.picture).toEqual({ data: 'SU1H', filename: 'libregaku_test_3000.jpg' });
    expect(String(card.source)).toContain('0:03');
    expect(p.clock.now).toBe(3.5);
    expect(popup.querySelector('.toast')?.textContent).toBe('sentence added to Vocabulary');
  });

  it('says a line is already in the deck rather than failing', async () => {
    const { DuplicateNote } = await import('../../anki/client');
    api.addNote.mockRejectedValueOnce(new DuplicateNote('Vocabulary', '食べる'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb[aria-label="Add sentence"]')!.click();
    await flush();
    await flush();
    expect(popup.querySelector('.toast')?.textContent).toBe('the sentence is already in Vocabulary');
  });

  it('keeps a line made while Anki is closed, and says it will go in without its sound', async () => {
    const { AnkiUnavailable } = await import('../../anki/rpc');
    api.addNote.mockRejectedValueOnce(new AnkiUnavailable('Nothing is listening on port 8765.'));
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('.tb[aria-label="Add sentence"]')!.click();
    await flush();
    await flush();
    const waiting = Object.entries(local).filter(([k]) => k.startsWith('libregaku.cards.pending.'));
    expect(waiting).toHaveLength(1);
    expect((waiting[0]![1] as { card: { expression: string; tags: string[] } }).card.tags).toContain('libregaku::sentence');
    expect(popup.querySelector('.toast')?.textContent)
      .toBe('Anki is closed — the sentence goes to Vocabulary when it opens, without its sound or picture');
  });

  it('records nothing and touches nothing when both are switched off', async () => {
    Object.assign(cap, { record: true, still: { data: 'SU1H', type: 'image/jpeg' } });
    const { setSetting } = await import('../../settings');
    await setSetting('cardSentenceAudio', false);
    await setSetting('cardScreenshot', false);
    const p = await player([[0, 2, '食べる']], 1);
    const popup = await openWord();
    popup.querySelector<HTMLButtonElement>('button.add')!.click();
    await vi.advanceTimersByTimeAsync(100);
    p.stop();
    expect(cap.starts).toBe(0);
    const card = api.addNote.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(card.picture).toBeNull();
    expect(popup.querySelector('.toast')?.textContent).toBe('added to Vocabulary');
  });
});
