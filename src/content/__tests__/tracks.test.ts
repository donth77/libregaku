import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { Cue, TrackInfo } from '../../adapters/types';

/**
 * Which tracks the page loads, and what it tells the toolbar popup, as a
 * video's track list changes under it: a site can send a list twice, and
 * Netflix sends another each time its player fetches a track it had only
 * named. The page used to keep the first list for good.
 */

const api = vi.hoisted(() => ({
  navigate: () => {},
  /** The site announcing a track list, as an adapter does. */
  announce: () => {},
  tracks: [] as TrackInfo[],
  /** What loading each track gives: its lines, or the error it fails with. */
  load: {} as Record<string, unknown>,
  loaded: [] as string[],
  /** Run in the middle of loading a track, before it answers. */
  whileLoading: null as null | ((id: string) => void),
}));

vi.mock('../../anki/status', async (original) => ({
  ...await original<typeof import('../../anki/status')>(),
  buildStatusMap: async () => ({ size: 0, get: () => 'unknown' }),
}));
vi.mock('../../anki/client', async (original) => ({
  ...await original<typeof import('../../anki/client')>(),
  ensureModel: async () => 'present',
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
      return [{ surface: text, lemma: text, start: 0, end: text.length, content: true }];
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
    async listTracks() { return api.tracks.map((t) => ({ ...t })); }
    async loadTrack(id: string) {
      api.loaded.push(id);
      api.whileLoading?.(id);
      const got = api.load[id];
      if (got instanceof Error) throw got;
      return (got as unknown[] | undefined) ?? [];
    }
    hideNative() {}
    onNavigate(cb: () => void) { api.navigate = cb; }
    onTracks(cb: () => void) { api.announce = cb; }
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

const track = (id: string, lang: string, label: string, more: Partial<TrackInfo> = {}): TrackInfo =>
  ({ id, lang, label, ...more });
const ja = track('ja', 'ja', 'Japanese');
const en = track('en', 'en', 'English');
const fr = track('fr', 'fr', 'French');
const lines = (text: string): Cue[] => [{ start: 0, end: 10, text }];

interface PageState {
  rendering: boolean;
  tracks: TrackInfo[];
  track: string | null;
  second: string | null;
  notice: string | null;
}

type Listener = (msg: unknown, sender: unknown, respond: (answer: unknown) => void) => boolean;
let toPage: Listener;
let stored: Record<string, unknown>;
let listeners: MockInstance<Document['addEventListener']>;

/** Long enough for a frame: a notice's words go in the frame after its card. */
const flush = () => vi.advanceTimersByTimeAsync(20);

/** What the page tells the toolbar popup. */
async function state(): Promise<PageState> {
  const answer = new Promise<PageState>((resolve) => toPage({ type: 'lg-state' }, {}, (a) => resolve(a as PageState)));
  await flush();
  return answer;
}

/** A pick in the toolbar popup, answered once the page has loaded it or failed to. */
async function pick(choice: { track?: string; second?: string }): Promise<void> {
  const done = new Promise<void>((resolve) => toPage({ type: 'lg-set-tracks', ...choice }, {}, () => resolve()));
  await flush();
  await done;
}

const overlay = (): HTMLElement | null => document.querySelector('.libregaku-root');
/** The line on screen, and the line under it. */
const shown = (): [string, string] => {
  const root = overlay()?.shadowRoot;
  return [root?.querySelector('.primary')?.textContent ?? '', root?.querySelector('.secondary')?.textContent ?? ''];
};
/** The notice over the player: what broke, and its two lines. */
const notice = (): { id: string; title: string; detail: string } | null => {
  const root = document.querySelector('.libregaku-notice')?.shadowRoot;
  if (!root) return null;
  const text = (selector: string) => root.querySelector(selector)?.textContent ?? '';
  return { id: text('.id'), title: text('.title'), detail: text('.detail') };
};

/** Open the page on a video with these tracks. */
async function open(tracks: TrackInfo[], load: Record<string, Cue[] | Error> = {}): Promise<void> {
  api.tracks = tracks;
  api.load = { ja: lines('日本語'), en: lines('English'), fr: lines('Français'), ...load };
  await import('../index');
  await flush();
}

/** The site sends a list again. */
async function announce(tracks: TrackInfo[]): Promise<void> {
  api.tracks = tracks;
  api.announce();
  await flush();
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  stored = { 'libregaku.settings': { deck: 'Vocabulary', target: 'ja', native: 'en', dualSubtitles: true } };
  const read = (area: Record<string, unknown>) => async (keys: string | string[] | null) =>
    (keys === null ? { ...area } : Object.fromEntries([keys].flat().map((k) => [k, area[k]])));
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get: read(stored), set: async (patch: Record<string, unknown>) => { Object.assign(stored, patch); }, remove: async () => {} },
      local: { get: read({}), set: async () => {}, remove: async () => {} },
      onChanged: { addListener: () => {} },
    },
    runtime: { onMessage: { addListener: (l: Listener) => { toPage = l; } } },
  });
  Object.assign(api, { tracks: [], load: {}, loaded: [], whileLoading: null });
  listeners = vi.spyOn(document, 'addEventListener');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  document.body.innerHTML = '<div id="movie_player"><video></video></div>';
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

describe('a track list that arrives after the page has settled', () => {
  it('brings the subtitles when it has the language that was missing', async () => {
    await open([en, fr]);
    expect(notice()).toMatchObject({ id: 'no-target-track', title: 'No subtitles here in the language you are learning.' });
    // The toolbar is told what the notice says, to say it too.
    expect(await state()).toMatchObject({
      rendering: true, track: null, second: null, notice: 'No subtitles here in the language you are learning.',
    });
    expect((await state()).tracks.map((t) => t.id)).toEqual(['en', 'fr']);

    await announce([ja, en, fr]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(notice()).toBeNull();
    const now = await state();
    expect(now).toMatchObject({ rendering: true, track: 'ja', second: 'en', notice: null });
    expect(now.tracks.map((t) => t.id)).toEqual(['ja', 'en', 'fr']);
  });

  it('brings the second line when it has the track that was missing', async () => {
    await open([ja]);
    expect(shown()).toEqual(['日本語', '']);
    expect(notice()?.id).toBe('only-one-track');

    await announce([ja, en]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(await state()).toMatchObject({ track: 'ja', second: 'en' });
  });

  it('is told to the toolbar and rebuilds nothing when it changes nothing on screen', async () => {
    await open([ja, en]);
    const drawn = overlay();
    expect(shown()).toEqual(['日本語', 'English']);
    expect(api.loaded).toEqual(['ja', 'en']);

    // A language nobody here is learning or reading.
    await announce([ja, en, fr]);
    expect(overlay()).toBe(drawn);
    expect(api.loaded).toEqual(['ja', 'en']);
    const now = await state();
    expect(now.tracks.map((t) => t.label)).toEqual(['Japanese', 'English', 'French']);
    expect(now).toMatchObject({ track: 'ja', second: 'en' });
  });

  it('does nothing at all when it is the same list again', async () => {
    await open([ja, en]);
    const drawn = overlay();
    await announce([{ ...ja }, { ...en }]);
    await announce([{ ...ja }, { ...en }]);
    expect(overlay()).toBe(drawn);
    expect(api.loaded).toEqual(['ja', 'en']);
  });

  it('starts over when the track on screen is no longer in it', async () => {
    const older = track('ja-old', 'ja', 'Japanese (old)');
    await open([older, en], { 'ja-old': lines('古い') });
    expect(shown()).toEqual(['古い', 'English']);

    await announce([ja, en]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(await state()).toMatchObject({ track: 'ja' });
  });

  it('leaves a run in flight to read the list itself', async () => {
    // The list announced while a track is loading is the one that track's own fetch brought.
    api.whileLoading = (id) => {
      if (id === 'ja') api.announce();
    };
    await open([ja, en]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(api.loaded).toEqual(['ja', 'en']);
  });
});

describe("a track the site named and its player has to be asked for", () => {
  const asked = track('ja', 'ja', 'Japanese', { onRequest: true });

  it('is loaded like any other when the player hands it over', async () => {
    await open([asked, en]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(notice()).toBeNull();
  });

  it('says which track to choose in the player when it does not, and reads nothing else as that language', async () => {
    await open([asked, en], { ja: new Error('libregaku: not loaded by the player yet') });
    expect(notice()).toEqual({
      id: 'track-not-sent',
      title: "The player hasn't loaded these subtitles yet.",
      detail: "Choose Japanese in the player's own subtitle menu and Libregaku will pick them up.",
    });
    expect(overlay()).toBeNull();
    // Nothing is in use, and the toolbar says so.
    expect(await state()).toMatchObject({
      rendering: true, track: null, second: null, notice: "The player hasn't loaded these subtitles yet.",
    });

    // Waved away, the notice is no longer what the page says.
    document.querySelector('.libregaku-notice')!.shadowRoot!.querySelector('button')!.click();
    expect(await state()).toMatchObject({ track: null, notice: null });
    expect((await state()).tracks.map((t) => t.id)).toEqual(['ja', 'en']);
  });

  it('is picked up once choosing it in the player has brought it', async () => {
    await open([asked, en], { ja: new Error('libregaku: not loaded by the player yet') });
    expect(overlay()).toBeNull();

    // The learner chooses Japanese in the site's menu: the same list, the track now sent.
    api.load.ja = lines('日本語');
    await announce([ja, en]);
    expect(shown()).toEqual(['日本語', 'English']);
    expect(notice()).toBeNull();
    expect(await state()).toMatchObject({ track: 'ja', second: 'en' });
  });

  it('chooses again when the track came with nothing to read and left the list', async () => {
    const captions = track('ja-cc', 'ja', 'Japanese [CC]', { cc: true });
    api.whileLoading = (id) => {
      // Asked for, it came as pictures: the adapter drops it.
      if (id === 'ja') api.tracks = [captions, en];
    };
    await open([asked, captions, en], { ja: new Error('libregaku: not loaded by the player yet'), 'ja-cc': lines('字幕') });
    expect(api.loaded).toEqual(['ja', 'ja-cc', 'en']);
    expect(shown()).toEqual(['字幕', 'English']);
    expect(await state()).toMatchObject({ track: 'ja-cc', second: 'en' });
  });

  it('says there are none in the language when the only one came with nothing to read', async () => {
    api.whileLoading = (id) => {
      if (id === 'ja') api.tracks = [en, fr];
    };
    await open([asked, en, fr], { ja: new Error('libregaku: not loaded by the player yet') });
    expect(notice()).toMatchObject({ id: 'no-target-track', detail: expect.stringContaining('English, French') });
    expect(await state()).toMatchObject({ track: null });
  });

  it('names it under the second line when that is the one the player kept', async () => {
    const english = track('en', 'en', 'English', { onRequest: true });
    await open([ja, english], { en: new Error('libregaku: not loaded by the player yet — choose it once in the player’s subtitle menu') });
    expect(shown()).toEqual(['日本語', '']);
    expect(notice()).toMatchObject({ id: 'second-track-failed', detail: expect.stringContaining('English: Error: libregaku: not loaded by the player yet') });

    // Chosen in the player since: the second line arrives.
    api.load.en = lines('English');
    await announce([ja, en]);
    expect(shown()).toEqual(['日本語', 'English']);
  });
});

describe('what the page tells the toolbar popup', () => {
  it('is the track in use, and the pick while it loads', async () => {
    await open([ja, en, fr]);
    expect(await state()).toMatchObject({ rendering: true, track: 'ja', second: 'en' });

    await pick({ second: 'fr' });
    expect(shown()).toEqual(['日本語', 'Français']);
    expect(await state()).toMatchObject({ track: 'ja', second: 'fr' });

    await pick({ second: '' });
    expect(shown()).toEqual(['日本語', '']);
    expect(await state()).toMatchObject({ track: 'ja', second: null });
  });

  it('never has one track as both lines: picking the translation as the subtitles moves the translation', async () => {
    await open([ja, en, fr]);
    await pick({ second: 'fr' });
    await pick({ track: 'fr' });
    // French is studied now, so the line under it goes back to the learner's own language.
    expect(await state()).toMatchObject({ track: 'fr', second: 'en' });
    expect(shown()).toEqual(['Français', 'English']);

    // And English as the subtitles leaves no English for the line underneath.
    await pick({ track: 'en' });
    expect(await state()).toMatchObject({ track: 'en', second: 'fr' });
  });

  it('is nothing in use once a pick has failed for good', async () => {
    const asked = track('ko', 'ko', 'Korean', { onRequest: true });
    await open([ja, en, asked], { ko: new Error('libregaku: not loaded by the player yet') });
    await pick({ track: 'ko' });
    expect(notice()?.id).toBe('track-not-sent');
    expect(await state()).toMatchObject({ rendering: true, track: null });
  });
});
