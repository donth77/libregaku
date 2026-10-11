import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Netflix page hook (src/content/inject-netflix.ts): installed once,
 * reporting manifests that pass through JSON.parse, replaying them on request,
 * fetching a track the player was not sent, and seeking through the player API.
 *
 * Importing it patches the global JSON.parse and JSON.stringify, so the
 * originals go back after. It is imported once, and remembers every manifest
 * it sees: each test uses a title of its own.
 */

const TAG = 'libregaku';
const nativeParse = JSON.parse;
const nativeStringify = JSON.stringify;
const page = window as unknown as Record<string, unknown>;

/** A message as the content script posts it: from this window. */
function fromContentScript(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

const MANIFEST = JSON.stringify({
  result: {
    movieId: 5,
    textTracks: [{
      language: 'ja',
      languageDescription: 'Japanese',
      rawTrackType: 'subtitles',
      downloadables: {
        'imsc1.1': { urls: [{ url: 'https://a.oca.nflxvideo.net/ja' }, { url: 'https://b.oca.nflxvideo.net/ja' }] },
      },
    }],
  },
});

const posted = (post: { mock: { calls: unknown[][] } }, kind: string) =>
  post.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((m) => m?.kind === kind);

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await import('../../content/inject-netflix');
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  delete page['netflix'];
});

afterAll(() => {
  JSON.parse = nativeParse;
  JSON.stringify = nativeStringify;
  delete page['__libregakuNetflixHook'];
  delete page['__libregakuHook'];
});

describe('netflix page hook', () => {
  it('wraps JSON.parse once, however many times it is injected', async () => {
    const wrapped = JSON.parse;
    expect(wrapped).not.toBe(nativeParse);

    // Declared in the manifest and injected by the service worker: both run.
    vi.resetModules();
    await import('../../content/inject-netflix');
    expect(JSON.parse).toBe(wrapped);
  });

  it('reports every URL of a manifest passing through JSON.parse, and returns the data untouched', () => {
    const post = vi.spyOn(window, 'postMessage');
    const data = JSON.parse(MANIFEST) as { result: { movieId: number } };

    expect(data.result.movieId).toBe(5);
    const [sent] = posted(post, 'nf-tracks');
    expect(sent).toMatchObject({ source: TAG, movieId: '5' });
    expect((sent?.tracks as Array<{ urls: string[] }>)[0]?.urls).toEqual([
      'https://a.oca.nflxvideo.net/ja',
      'https://b.oca.nflxvideo.net/ja',
    ]);
  });

  it('replays what it saw when a content script arrives late and asks', () => {
    JSON.parse(MANIFEST);
    const post = vi.spyOn(window, 'postMessage');
    fromContentScript({ source: TAG, kind: 'nf-request-tracks' });
    expect(posted(post, 'nf-tracks')).toEqual([expect.objectContaining({ movieId: '5' })]);
  });

  it('takes no requests from other windows', () => {
    const post = vi.spyOn(window, 'postMessage');
    window.dispatchEvent(new MessageEvent('message', { data: { source: TAG, kind: 'nf-request-tracks' } }));
    expect(post).not.toHaveBeenCalled();
  });

  it('warns about a track offered only in an encoding it cannot read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    JSON.parse(JSON.stringify({
      result: { textTracks: [{ language: 'ja', downloadables: { imsc2: { urls: [{ url: 'https://a.oca.nflxvideo.net/x' }] } } }] },
    }));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot read'), 'ja: imsc2');
  });

  it("seeks through the player API, on the watch session rather than a preview's", () => {
    const watch = vi.fn();
    const preview = vi.fn();
    page['netflix'] = {
      appContext: { state: { playerApp: { getAPI: () => ({
        videoPlayer: {
          getAllPlayerSessionIds: () => ['motion-billboard-1', 'watch-81234567'],
          getVideoPlayerBySessionId: (id: string) => ({ seek: id.startsWith('watch') ? watch : preview }),
        },
      }) } } },
    };
    const post = vi.spyOn(window, 'postMessage');

    fromContentScript({ source: TAG, kind: 'nf-seek', ms: 61000, token: 7 });

    expect(watch).toHaveBeenCalledWith(61000);
    expect(preview).not.toHaveBeenCalled();
    expect(posted(post, 'nf-seek-done')).toEqual([{ source: TAG, kind: 'nf-seek-done', token: 7, via: 'api' }]);
  });

  it('sets currentTime, and says so, only when the player API is missing', () => {
    document.body.innerHTML = '<video></video>';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const post = vi.spyOn(window, 'postMessage');

    fromContentScript({ source: TAG, kind: 'nf-seek', ms: 5000, token: 8 });

    expect(document.querySelector('video')?.currentTime).toBe(5);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('M7375'));
    expect(posted(post, 'nf-seek-done')).toEqual([{ source: TAG, kind: 'nf-seek-done', token: 8, via: 'currentTime' }]);
  });

  it('ignores a seek that is not a time', () => {
    const post = vi.spyOn(window, 'postMessage');
    fromContentScript({ source: TAG, kind: 'nf-seek', ms: 'soon', token: 9 });
    fromContentScript({ source: TAG, kind: 'nf-seek', ms: -5, token: 10 });
    expect(post).not.toHaveBeenCalled();
  });
});

/**
 * A title whose first manifest sends Japanese and English and only names
 * Chinese, and the manifest the player gets once it asks for Chinese. The
 * shape is read from Netflix's player bundle, not recorded from a session.
 */
const cdnUrl = (name: string) => ({ urls: [{ url: `https://a.oca.nflxvideo.net/${name}` }] });
const firstManifest = (movieId: number) => JSON.stringify({
  result: {
    movieId,
    textTracks: [
      { id: 'T:off', isNoneTrack: true, hydrated: true, downloadables: {} },
      { id: 'T:ja', language: 'ja', languageDescription: 'Japanese', hydrated: true, downloadables: { 'imsc1.1': cdnUrl(`${movieId}/ja`) } },
      { id: 'T:zh', language: 'zh-Hans', languageDescription: 'Chinese (Simplified)', hydrated: false },
      { id: 'T:ko', language: 'ko', languageDescription: 'Korean', hydrated: false },
      { id: 'T:en', language: 'en', languageDescription: 'English', hydrated: true, downloadables: { 'imsc1.1': cdnUrl(`${movieId}/en`) } },
    ],
  },
});
const answerManifest = (movieId: number, trackId: string, language: string) => JSON.stringify({
  result: {
    movieId,
    textTracks: [
      { id: 'T:ja', language: 'ja', languageDescription: 'Japanese', hydrated: false },
      { id: trackId, language, hydrated: true, downloadables: { 'imsc1.1': cdnUrl(`${movieId}/${language}`) } },
      { id: 'T:en', language: 'en', languageDescription: 'English', hydrated: false },
    ],
  },
});

type Said = Array<{ language: string; waiting?: boolean; urls: string[] }>;
/** The last list posted, as "language" or "language?" for one still waiting. */
const lastList = (post: { mock: { calls: unknown[][] } }): string[] =>
  ((posted(post, 'nf-tracks').at(-1)?.tracks ?? []) as Said).map((t) => (t.waiting ? `${t.language}?` : t.language));

describe('a title whose manifests come one track at a time', () => {
  it('lists the tracks not sent yet, and keeps what came first when the next manifest names it again', () => {
    const post = vi.spyOn(window, 'postMessage');
    JSON.parse(firstManifest(601));
    expect(lastList(post)).toEqual(['ja', 'zh-Hans?', 'ko?', 'en']);

    JSON.parse(answerManifest(601, 'T:zh', 'zh-Hans'));
    expect(lastList(post)).toEqual(['ja', 'zh-Hans', 'ko?', 'en']);
    const tracks = posted(post, 'nf-tracks').at(-1)?.tracks as Said;
    expect(tracks[0]?.urls).toEqual(['https://a.oca.nflxvideo.net/601/ja']);
    expect(tracks[1]?.urls).toEqual(['https://a.oca.nflxvideo.net/601/zh-Hans']);
  });

  it('replays one list for the title, with everything its manifests sent', () => {
    JSON.parse(firstManifest(602));
    JSON.parse(answerManifest(602, 'T:ko', 'ko'));
    const post = vi.spyOn(window, 'postMessage');
    fromContentScript({ source: TAG, kind: 'nf-request-tracks' });
    const mine = posted(post, 'nf-tracks').filter((m) => m.movieId === '602');
    expect(mine).toHaveLength(1);
    expect((mine[0]?.tracks as Said).map((t) => (t.waiting ? `${t.language}?` : t.language))).toEqual(['ja', 'zh-Hans?', 'ko', 'en']);
  });

  it('never forgets the title being watched, however many others pass', () => {
    history.pushState({}, '', '/watch/603');
    JSON.parse(firstManifest(603));
    // Previews and next episodes: more titles than are remembered.
    for (let other = 700; other < 712; other++) JSON.parse(firstManifest(other));
    const post = vi.spyOn(window, 'postMessage');
    JSON.parse(answerManifest(603, 'T:zh', 'zh-Hans'));
    expect(lastList(post)).toEqual(['ja', 'zh-Hans', 'ko?', 'en']);
    history.pushState({}, '', '/');
  });
});

describe('fetching a track the player was not sent', () => {
  interface PlayerTrack { trackId: string }

  /**
   * A stand-in for Netflix's player, as read from its bundle: a list of the
   * subtitle choices, the one in use, and a change of track that fetches a
   * manifest when the track had not been sent. `fetch` is what that fetching
   * does; left out, the change goes through and nothing arrives.
   */
  function playing(movieId: number, inUse: string, fetch?: (track: PlayerTrack) => void | Promise<void>) {
    const list: PlayerTrack[] = ['T:off', 'T:ja', 'T:zh', 'T:ko', 'T:en'].map((trackId) => ({ trackId }));
    const state = { current: list.find((t) => t.trackId === inUse) as PlayerTrack | undefined };
    const changes: string[] = [];
    const setTimedTextTrack = vi.fn(async (track: PlayerTrack) => {
      // Netflix finds the track by the object it handed out, not by its id.
      const at = list.indexOf(track);
      if (at < 0) throw new Error('Invalid setTextTrack call');
      changes.push(track.trackId);
      const waiting = track.trackId === 'T:zh' || track.trackId === 'T:ko';
      if (waiting && fetch) {
        await fetch(track);
        // Once its files are in, the player has a new object for the track.
        list[at] = { trackId: track.trackId };
      }
      state.current = list[at];
    });
    const api = {
      seek: () => {},
      getMovieId: () => movieId,
      getTimedTextTrackList: () => list.slice(),
      getTimedTextTrack: () => state.current,
      setTimedTextTrack,
    };
    page['netflix'] = {
      appContext: { state: { playerApp: { getAPI: () => ({
        videoPlayer: {
          getAllPlayerSessionIds: () => ['motion-billboard-1', `watch-${movieId}`],
          getVideoPlayerBySessionId: (id: string) => (id.startsWith('watch') ? api : { seek: () => {} }),
        },
      }) } } },
    };
    return { list, state, changes, setTimedTextTrack };
  }

  const ask = (movieId: number, trackId: string, token: number) =>
    fromContentScript({ source: TAG, kind: 'nf-send-track', movieId: String(movieId), trackId, token });
  const answers = (post: { mock: { calls: unknown[][] } }) =>
    posted(post, 'nf-track-sent').map((m) => [m.token, m.why]);
  /** Let the hook's promises run. */
  const settle = () => vi.advanceTimersByTimeAsync(1);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the player on the track, reads the manifest that follows, and puts it back', async () => {
    JSON.parse(firstManifest(801));
    const p = playing(801, 'T:en', () => void JSON.parse(answerManifest(801, 'T:zh', 'zh-Hans')));
    const [, , zh, , en] = p.list;
    const post = vi.spyOn(window, 'postMessage');

    ask(801, 'T:zh', 1);
    await settle();

    // The list's own object for the track, then the one the viewer had.
    expect(p.setTimedTextTrack).toHaveBeenCalledTimes(2);
    expect(p.setTimedTextTrack.mock.calls[0]?.[0]).toBe(zh);
    expect(p.setTimedTextTrack.mock.calls[1]?.[0]).toBe(en);
    expect(p.state.current).toBe(en);
    expect(lastList(post)).toEqual(['ja', 'zh-Hans', 'ko?', 'en']);
    expect(answers(post)).toEqual([[1, null]]);
    // The list came before the answer: the content script reads it first.
    const kinds = post.mock.calls.map((c) => (c[0] as { kind?: string }).kind);
    expect(kinds.indexOf('nf-tracks')).toBeLessThan(kinds.indexOf('nf-track-sent'));
  });

  it('goes back to "Off" when subtitles were off', async () => {
    JSON.parse(firstManifest(802));
    const p = playing(802, 'T:off', () => void JSON.parse(answerManifest(802, 'T:ko', 'ko')));
    const post = vi.spyOn(window, 'postMessage');
    ask(802, 'T:ko', 2);
    await settle();
    expect(p.changes).toEqual(['T:ko', 'T:off']);
    expect(answers(post)).toEqual([[2, null]]);
  });

  it('leaves the player alone for a track that is already here', async () => {
    JSON.parse(firstManifest(803));
    const p = playing(803, 'T:en');
    const post = vi.spyOn(window, 'postMessage');
    ask(803, 'T:ja', 3);
    await settle();
    expect(p.setTimedTextTrack).not.toHaveBeenCalled();
    expect(answers(post)).toEqual([[3, null]]);
  });

  it('leaves the viewer on a track they chose while it was fetching', async () => {
    JSON.parse(firstManifest(804));
    const p = playing(804, 'T:en', () => void JSON.parse(answerManifest(804, 'T:zh', 'zh-Hans')));
    // The viewer picks Japanese in Netflix's menu the moment the fetch is done.
    p.setTimedTextTrack.mockImplementationOnce(async (track) => {
      p.changes.push(track.trackId);
      JSON.parse(answerManifest(804, 'T:zh', 'zh-Hans'));
      p.state.current = p.list[1];
    });
    const post = vi.spyOn(window, 'postMessage');
    ask(804, 'T:zh', 4);
    await settle();
    expect(p.changes).toEqual(['T:zh']);
    expect(p.state.current?.trackId).toBe('T:ja');
    expect(answers(post)).toEqual([[4, null]]);
  });

  it('says so when the change went through and no manifest followed, and does not try a second time', async () => {
    JSON.parse(firstManifest(805));
    const p = playing(805, 'T:en');
    const post = vi.spyOn(window, 'postMessage');
    ask(805, 'T:zh', 5);
    await settle();
    expect(p.changes).toEqual(['T:zh', 'T:en']);
    expect(answers(post)).toEqual([[5, 'nothing-came']]);

    // Asked again, the player is not moved again: the same change brings the same nothing.
    ask(805, 'T:zh', 6);
    await settle();
    expect(p.changes).toEqual(['T:zh', 'T:en']);
    expect(answers(post)).toEqual([[5, 'nothing-came'], [6, 'nothing-came']]);

    // But once the viewer's own choice has brought it, the answer is that it is here.
    JSON.parse(answerManifest(805, 'T:zh', 'zh-Hans'));
    ask(805, 'T:zh', 7);
    await settle();
    expect(answers(post).at(-1)).toEqual([7, null]);
    expect(p.changes).toEqual(['T:zh', 'T:en']);
  });

  it('says so when the player refuses the change, and may be asked again', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    JSON.parse(firstManifest(806));
    const p = playing(806, 'T:en', () => void JSON.parse(answerManifest(806, 'T:zh', 'zh-Hans')));
    p.setTimedTextTrack.mockRejectedValueOnce(new Error('Invalid setTextTrack call'));
    const post = vi.spyOn(window, 'postMessage');
    ask(806, 'T:zh', 8);
    await settle();
    expect(answers(post)).toEqual([[8, 'refused']]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('would not change'), expect.any(Error));
    // Nothing was changed, so there is nothing to put back.
    expect(p.setTimedTextTrack).toHaveBeenCalledTimes(1);

    // The player never left its track, so asking again costs nothing.
    ask(806, 'T:zh', 80);
    await settle();
    expect(p.changes).toEqual(['T:zh', 'T:en']);
    expect(answers(post).at(-1)).toEqual([80, null]);
  });

  it('asks again later when the player was not there to ask', async () => {
    JSON.parse(firstManifest(807));
    const post = vi.spyOn(window, 'postMessage');
    ask(807, 'T:zh', 9);
    await settle();
    expect(answers(post)).toEqual([[9, 'no-player']]);

    const p = playing(807, 'T:en', () => void JSON.parse(answerManifest(807, 'T:zh', 'zh-Hans')));
    ask(807, 'T:zh', 10);
    await settle();
    expect(p.changes).toEqual(['T:zh', 'T:en']);
    expect(answers(post).at(-1)).toEqual([10, null]);
  });

  it('says at once when the player is there without the calls that change its track', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    JSON.parse(firstManifest(813));
    // As after a rename on Netflix's side: seeking still works, the track list is gone.
    page['netflix'] = {
      appContext: { state: { playerApp: { getAPI: () => ({
        videoPlayer: {
          getAllPlayerSessionIds: () => ['watch-813'],
          getVideoPlayerBySessionId: () => ({ seek: () => {}, getMovieId: () => 813 }),
        },
      }) } } },
    };
    const post = vi.spyOn(window, 'postMessage');
    ask(813, 'T:zh', 18);
    await settle();
    expect(answers(post)).toEqual([[18, 'cannot-ask']]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setTimedTextTrack'));

    // Asking again says the same without looking again.
    warn.mockClear();
    ask(813, 'T:zh', 19);
    await settle();
    expect(answers(post).at(-1)).toEqual([19, 'cannot-ask']);
    expect(warn).not.toHaveBeenCalled();
  });

  it("asks the player that is on the title, not the one the last episode left behind", async () => {
    JSON.parse(firstManifest(814));
    const old = { seek: () => {}, getMovieId: () => 800, getTimedTextTrackList: vi.fn(() => []), getTimedTextTrack: () => undefined, setTimedTextTrack: vi.fn() };
    const p = playing(814, 'T:en', () => void JSON.parse(answerManifest(814, 'T:zh', 'zh-Hans')));
    // Two watch sessions for a moment, the older one first.
    const now = (page['netflix'] as { appContext: { state: { playerApp: { getAPI: () => { videoPlayer: { getVideoPlayerBySessionId: (id: string) => unknown } } } } } })
      .appContext.state.playerApp.getAPI().videoPlayer.getVideoPlayerBySessionId('watch-814');
    page['netflix'] = {
      appContext: { state: { playerApp: { getAPI: () => ({
        videoPlayer: {
          getAllPlayerSessionIds: () => ['watch-800', 'watch-814'],
          getVideoPlayerBySessionId: (id: string) => (id === 'watch-800' ? old : now),
        },
      }) } } },
    };
    const post = vi.spyOn(window, 'postMessage');
    ask(814, 'T:zh', 20);
    await settle();
    expect(old.setTimedTextTrack).not.toHaveBeenCalled();
    expect(p.changes).toEqual(['T:zh', 'T:en']);
    expect(answers(post)).toEqual([[20, null]]);
  });

  it("never moves another title's player, nor to a track it does not offer", async () => {
    JSON.parse(firstManifest(808));
    const p = playing(809, 'T:en');
    const post = vi.spyOn(window, 'postMessage');
    ask(808, 'T:zh', 11);
    await settle();
    expect(answers(post)).toEqual([[11, 'another-title']]);

    JSON.parse(firstManifest(809));
    ask(809, 'T:fr', 12);
    await settle();
    expect(answers(post).at(-1)).toEqual([12, 'not-offered']);
    expect(p.setTimedTextTrack).not.toHaveBeenCalled();
  });

  it('fetches one track at a time', async () => {
    JSON.parse(firstManifest(810));
    let release: () => void = () => {};
    const p = playing(810, 'T:en', async (track) => {
      if (track.trackId === 'T:zh') await new Promise<void>((resolve) => { release = resolve; });
      JSON.parse(answerManifest(810, track.trackId, track.trackId === 'T:zh' ? 'zh-Hans' : 'ko'));
    });
    const post = vi.spyOn(window, 'postMessage');
    ask(810, 'T:zh', 13);
    ask(810, 'T:ko', 14);
    await settle();
    // Korean waits for Chinese to come and the player to be put back.
    expect(p.changes).toEqual(['T:zh']);
    release();
    await settle();
    expect(p.changes).toEqual(['T:zh', 'T:en', 'T:ko', 'T:en']);
    expect(answers(post)).toEqual([[13, null], [14, null]]);
    expect(lastList(post)).toEqual(['ja', 'zh-Hans', 'ko', 'en']);
  });

  it('does not wait for ever on a change that never settles', async () => {
    JSON.parse(firstManifest(811));
    const p = playing(811, 'T:en', () => new Promise<void>(() => {}));
    const post = vi.spyOn(window, 'postMessage');
    ask(811, 'T:zh', 15);
    await vi.advanceTimersByTimeAsync(19_000);
    expect(answers(post)).toEqual([]);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(answers(post)).toEqual([[15, 'nothing-came']]);
    expect(p.changes).toEqual(['T:zh']);
  });

  it('ignores a request that names no title or track', async () => {
    JSON.parse(firstManifest(812));
    const p = playing(812, 'T:en');
    const post = vi.spyOn(window, 'postMessage');
    fromContentScript({ source: TAG, kind: 'nf-send-track', movieId: 812, trackId: 'T:zh', token: 16 });
    fromContentScript({ source: TAG, kind: 'nf-send-track', movieId: '812', token: 17 });
    await settle();
    expect(post).not.toHaveBeenCalled();
    expect(p.setTimedTextTrack).not.toHaveBeenCalled();
  });
});
