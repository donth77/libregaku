import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetflixAdapter, watchIdOf } from '../netflix';
import type { TrackInfo } from '../types';

const TAG = 'libregaku';

/** A subtitle URL on Netflix's CDN, as its manifests hand them out. */
const cdn = (name: string) => `https://ipv4-c001-${name}.1.oca.nflxvideo.net/?o=1&v=1&e=1&t=x`;

const track = (
  language: string,
  label: string,
  urls: string[],
  extra: { forced?: boolean; cc?: boolean } = {},
) => ({ language, label, forced: false, cc: false, url: urls[0], urls, ...extra });

/** A message as the page hook posts it: from this window. */
function fromPage(data: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

const manifest = (movieId: string | null, tracks: unknown[]) =>
  fromPage({ source: TAG, kind: 'nf-tracks', movieId, tracks });

const ttml = (line: string) =>
  '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
  `ttp:tickRate="10000000"><body><div><p begin="10000000t" end="20000000t">${line}</p></div></body></tt>`;

function serve(bodies: Record<string, { status?: number; body?: string }>) {
  const fetch = vi.fn(async (url: string) => {
    const r = bodies[url] ?? { status: 404 };
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, text: async () => r.body ?? '' } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const labels = async (a: NetflixAdapter) => (await a.listTracks()).map((t) => t.label);
const byId = (list: TrackInfo[]) => Object.fromEntries(list.map((t) => [t.id, t.label]));

beforeEach(() => {
  history.pushState({}, '', '/watch/111');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('watchIdOf', () => {
  it('reads the id from a watch path, and nothing from anywhere else', () => {
    expect(watchIdOf('/watch/81234567')).toBe('81234567');
    expect(watchIdOf('/watch/81234567/')).toBe('81234567');
    expect(watchIdOf('/browse')).toBeNull();
    // YouTube's watch path, where this adapter is constructed too.
    expect(watchIdOf('/watch')).toBeNull();
  });
});

describe('NetflixAdapter track lists', () => {
  it('serves the list for the title in the URL, not the manifest seen last', async () => {
    const a = new NetflixAdapter();
    const nav = vi.fn();
    const tracks = vi.fn();
    a.onNavigate(nav);
    a.onTracks(tracks);

    manifest('111', [track('ja', 'Japanese', [cdn('ja111')]), track('en', 'English', [cdn('en111')])]);
    // The next episode's, prepared while this one is still playing.
    manifest('222', [track('ja', 'Japanese (next)', [cdn('ja222')])]);

    expect(await labels(a)).toEqual(['Japanese', 'English']);
    expect(tracks).toHaveBeenCalledTimes(1);
    expect(nav).not.toHaveBeenCalled();
  });

  it('serves the prepared list when the next episode starts, without a new manifest', async () => {
    const a = new NetflixAdapter();
    const nav = vi.fn();
    a.onNavigate(nav);
    manifest('111', [track('ja', 'Japanese', [cdn('ja111')]), track('en', 'English', [cdn('en111')])]);
    manifest('222', [track('ja', 'Japanese (next)', [cdn('ja222')])]);

    history.pushState({}, '', '/watch/222');
    vi.advanceTimersByTime(500);
    expect(nav).toHaveBeenCalledTimes(1);
    expect(await labels(a)).toEqual(['Japanese (next)']);

    // And nothing was thrown away on the way: going back finds the first list.
    history.pushState({}, '', '/watch/111');
    vi.advanceTimersByTime(500);
    expect(nav).toHaveBeenCalledTimes(2);
    expect(await labels(a)).toEqual(['Japanese', 'English']);
  });

  it('reports navigation only when the watch id changes', () => {
    const a = new NetflixAdapter();
    const nav = vi.fn();
    a.onNavigate(nav);

    history.pushState({}, '', '/watch/111?trackId=9');
    vi.advanceTimersByTime(1000);
    history.pushState({}, '', '/watch/111/');
    vi.advanceTimersByTime(1000);
    expect(nav).not.toHaveBeenCalled();

    history.pushState({}, '', '/browse');
    vi.advanceTimersByTime(500);
    expect(nav).toHaveBeenCalledTimes(1);
  });

  it('notices a new title as soon as its manifest lands, ahead of the URL poll', async () => {
    const a = new NetflixAdapter();
    const order: string[] = [];
    a.onNavigate(() => order.push('navigate'));
    a.onTracks(() => order.push('tracks'));

    history.pushState({}, '', '/watch/333');
    manifest('333', [track('ja', 'Japanese', [cdn('ja333')])]);

    expect(order).toEqual(['navigate', 'tracks']);
    expect(await labels(a)).toEqual(['Japanese']);
  });

  it('files a manifest without a movieId under the title on screen, never over one with an id', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = new NetflixAdapter();

    manifest(null, [track('ja', 'Unkeyed', [cdn('u1')])]);
    expect(await labels(a)).toEqual(['Unkeyed']);

    manifest('111', [track('ja', 'Keyed', [cdn('k1')])]);
    manifest(null, [track('ja', 'Unkeyed again', [cdn('u2')])]);
    expect(await labels(a)).toEqual(['Keyed']);
  });

  it('keeps track ids stable when a refreshed manifest reorders the tracks', async () => {
    const a = new NetflixAdapter();
    manifest('111', [
      track('ja', 'Japanese', [cdn('ja')]),
      track('en', 'English', [cdn('en')]),
      track('ja', 'Japanese [CC]', [cdn('jacc')], { cc: true }),
    ]);
    const before = byId(await a.listTracks());

    manifest('111', [
      track('ja', 'Japanese [CC]', [cdn('jacc')], { cc: true }),
      track('en', 'English', [cdn('en')]),
      track('ja', 'Japanese', [cdn('ja')]),
    ]);
    expect(byId(await a.listTracks())).toEqual(before);
  });

  it('names the video by its URL, not by a manifest for another title', () => {
    const a = new NetflixAdapter();
    manifest('222', [track('ja', 'Japanese', [cdn('ja222')])]);
    expect(a.videoId()).toBe('111');
    expect(a.deepLink(61.9)).toBe('https://www.netflix.com/watch/111?t=61');
  });
});

describe('NetflixAdapter message hygiene', () => {
  it('ignores messages that did not come from this window', async () => {
    const a = new NetflixAdapter();
    window.dispatchEvent(new MessageEvent('message', {
      data: { source: TAG, kind: 'nf-tracks', movieId: '111', tracks: [track('ja', 'x', [cdn('a')])] },
    }));
    expect(await a.listTracks()).toEqual([]);
  });

  it("keeps only https URLs on Netflix's subtitle CDN", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = new NetflixAdapter();
    manifest('111', [
      track('ja', 'Mixed', ['https://evil.example/ja.xml', 'http://ipv4.oca.nflxvideo.net/ja', cdn('good')]),
      track('en', 'Lookalike', ['https://nflxvideo.net.evil.example/en']),
    ]);
    const list = await a.listTracks();
    expect(list.map((t) => t.label)).toEqual(['Mixed']);
    expect(warn).toHaveBeenCalled();

    const fetch = serve({ [cdn('good')]: { body: ttml('字幕') } });
    await a.loadTrack(list[0]!.id);
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([cdn('good')]);
  });

  it('ignores malformed messages', async () => {
    const a = new NetflixAdapter();
    fromPage(null);
    fromPage('nf-tracks');
    fromPage({ source: TAG, kind: 'nf-tracks', movieId: '111', tracks: 'not a list' });
    fromPage({ source: TAG, kind: 'nf-tracks', movieId: '111', tracks: [null, 42, { language: 'ja' }] });
    fromPage({ source: TAG, kind: 'nf-tracks', movieId: { id: 111 }, tracks: [track('ja', 'x', [cdn('a')])] });
    // The last one had no usable movieId, so it was filed under the page — but
    // nothing malformed got in.
    expect(await labels(a)).toEqual(['x']);
  });
});

describe('subtitles Netflix has only as pictures', () => {
  it('are named, and never listed or loaded', async () => {
    const a = new NetflixAdapter();
    fromPage({ source: TAG, kind: 'nf-tracks', movieId: '111', tracks: [track('en', 'English', [cdn('en')])], pictures: ['zh-Hans', 42, 'zh-Hant'] });
    expect(a.pictureLanguages()).toEqual(['zh-Hans', 'zh-Hant']);
    expect(await labels(a)).toEqual(['English']);
    await expect(a.loadTrack('zh-Hans:pictures')).rejects.toThrow();
  });

  it('are kept when they are all a title has', async () => {
    const a = new NetflixAdapter();
    fromPage({ source: TAG, kind: 'nf-tracks', movieId: '111', tracks: [], pictures: ['zh-Hans'] });
    expect(a.pictureLanguages()).toEqual(['zh-Hans']);
    expect(await a.listTracks()).toEqual([]);
  });
});

describe('NetflixAdapter.loadTrack', () => {
  it('tries every URL until one yields cues', async () => {
    const a = new NetflixAdapter();
    manifest('111', [track('ja', 'Japanese', [cdn('down'), cdn('empty'), cdn('image'), cdn('up')])]);
    const fetch = serve({
      [cdn('down')]: { status: 503 },
      [cdn('empty')]: { body: '   ' },
      [cdn('image')]: { body: '\u0089PNG\r\n' },
      [cdn('up')]: { body: ttml('字幕') },
    });
    const [ja] = await a.listTracks();
    expect(await a.loadTrack(ja!.id)).toEqual([{ start: 1, end: 2, text: '字幕' }]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('reads WebVTT when that is what comes back', async () => {
    const a = new NetflixAdapter();
    manifest('111', [track('ja', 'Japanese', [cdn('vtt')])]);
    serve({ [cdn('vtt')]: { body: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<c.japanese>字幕</c.japanese>\n' } });
    const [ja] = await a.listTracks();
    expect(await a.loadTrack(ja!.id)).toEqual([{ start: 1, end: 2, text: '字幕' }]);
  });

  it('fetches a track once, including two loads in flight together', async () => {
    const a = new NetflixAdapter();
    manifest('111', [track('ja', 'Japanese', [cdn('ja')])]);
    const fetch = serve({ [cdn('ja')]: { body: ttml('字幕') } });
    const [ja] = await a.listTracks();

    const [x, y] = await Promise.all([a.loadTrack(ja!.id), a.loadTrack(ja!.id)]);
    const z = await a.loadTrack(ja!.id);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(x).toEqual(z);
    expect(y).not.toBe(z); // each caller gets its own array
  });

  it('does not remember a failure', async () => {
    const a = new NetflixAdapter();
    manifest('111', [track('ja', 'Japanese', [cdn('flaky')])]);
    let up = false;
    vi.stubGlobal('fetch', vi.fn(async () => (
      up
        ? { ok: true, status: 200, text: async () => ttml('字幕') }
        : { ok: false, status: 503, text: async () => '' }
    ) as unknown as Response));
    const [ja] = await a.listTracks();

    await expect(a.loadTrack(ja!.id)).rejects.toThrow(/no subtitle URL worked.*HTTP 503/);
    up = true;
    await expect(a.loadTrack(ja!.id)).resolves.toHaveLength(1);
  });

  it('refuses a track that is not in the list for this title', async () => {
    const a = new NetflixAdapter();
    manifest('222', [track('ja', 'Japanese', [cdn('ja222')])]);
    await expect(a.loadTrack('ja:sub:0')).rejects.toThrow(/unknown track/);
  });
});

describe('a track Netflix listed without its files', () => {
  /** As the page hook posts one: named, with the id the player knows it by, and no address. */
  const waiting = (language: string, label: string, trackId: string, extra: { cc?: boolean } = {}) =>
    ({ language, label, forced: false, cc: false, url: '', urls: [], trackId, waiting: true, ...extra });
  const sent = (language: string, label: string, trackId: string, urls: string[]) =>
    ({ ...track(language, label, urls), trackId });

  const asks = (post: { mock: { calls: unknown[][] } }) =>
    post.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((m) => m?.kind === 'nf-send-track');
  const answer = (token: unknown, why: string | null) =>
    fromPage({ source: TAG, kind: 'nf-track-sent', token, why });

  /** A title sent with Japanese and English, and Chinese only named. */
  const first = () =>
    manifest('111', [
      sent('ja', 'Japanese', 'T:ja', [cdn('ja')]),
      waiting('zh-Hans', 'Chinese (Simplified)', 'T:hans'),
      waiting('ja', 'Japanese [CC]', 'T:ja-cc', { cc: true }),
      sent('en', 'English', 'T:en', [cdn('en')]),
    ]);
  /** The same title once the player has fetched Chinese: what the hook posts then. */
  const withChinese = () =>
    manifest('111', [
      sent('ja', 'Japanese', 'T:ja', [cdn('ja')]),
      sent('zh-Hans', 'Chinese (Simplified)', 'T:hans', [cdn('hans')]),
      waiting('ja', 'Japanese [CC]', 'T:ja-cc', { cc: true }),
      sent('en', 'English', 'T:en', [cdn('en')]),
    ]);

  it('is listed with the others, in its place, as one to ask for', async () => {
    const a = new NetflixAdapter();
    first();
    expect(await a.listTracks()).toEqual([
      { id: 'ja:sub:0', lang: 'ja', label: 'Japanese', generated: false, forced: false, cc: false },
      { id: 'zh-Hans:sub:0', lang: 'zh-Hans', label: 'Chinese (Simplified)', generated: false, forced: false, cc: false, onRequest: true },
      { id: 'ja:cc:0', lang: 'ja', label: 'Japanese [CC]', generated: false, forced: false, cc: true, onRequest: true },
      { id: 'en:sub:0', lang: 'en', label: 'English', generated: false, forced: false, cc: false },
    ]);
  });

  it('is asked of the page hook, then loaded from the manifest that answers', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const told = vi.fn();
    a.onTracks(told);
    first();
    const fetch = serve({ [cdn('hans')]: { body: ttml('字幕') } });

    const loading = a.loadTrack('zh-Hans:sub:0');
    const [ask] = asks(post);
    expect(ask).toMatchObject({ source: TAG, kind: 'nf-send-track', movieId: '111', trackId: 'T:hans' });
    // Nothing is fetched until the player has been sent the track.
    expect(fetch).not.toHaveBeenCalled();

    withChinese();
    answer(ask?.token, null);
    expect(await loading).toEqual([{ start: 1, end: 2, text: '字幕' }]);
    expect(fetch).toHaveBeenCalledTimes(1);
    // The same name for the track as while it waited, and no longer one to ask for.
    expect((await a.listTracks())[1]).toEqual(
      { id: 'zh-Hans:sub:0', lang: 'zh-Hans', label: 'Chinese (Simplified)', generated: false, forced: false, cc: false },
    );
    // Both manifests were announced: the page follows the list.
    expect(told).toHaveBeenCalledTimes(2);
    // Here now, it is not asked for again.
    await a.loadTrack('zh-Hans:sub:0');
    expect(asks(post)).toHaveLength(1);
  });

  it('is asked for once by two loads in flight together', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    first();
    serve({ [cdn('hans')]: { body: ttml('字幕') } });

    const both = Promise.all([a.loadTrack('zh-Hans:sub:0'), a.loadTrack('zh-Hans:sub:0')]);
    expect(asks(post)).toHaveLength(1);
    withChinese();
    answer(asks(post)[0]?.token, null);
    expect((await both).map((cues) => cues.length)).toEqual([1, 1]);
  });

  it('fails, saying what to do, when the player changed track and nothing followed', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();
    const fetch = serve({});

    const loading = a.loadTrack('zh-Hans:sub:0');
    answer(asks(post)[0]?.token, 'nothing-came');
    await expect(loading).rejects.toThrow(/not loaded by the player yet/);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nothing-came'));
    expect(fetch).not.toHaveBeenCalled();
    // Asking again at once would bring the same nothing: it was asked the one time.
    expect(asks(post)).toHaveLength(1);
    // Still listed as one to ask for.
    expect((await a.listTracks())[1]).toMatchObject({ id: 'zh-Hans:sub:0', onRequest: true });
  });

  it('asks again while the player is not ready to be asked, and loads the track once it is', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    first();
    serve({ [cdn('hans')]: { body: ttml('字幕') } });

    const loading = a.loadTrack('zh-Hans:sub:0');
    // Still starting, then in an advert of its own before the film.
    answer(asks(post)[0]?.token, 'no-player');
    await vi.advanceTimersByTimeAsync(2_900);
    expect(asks(post)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(asks(post)).toHaveLength(2);
    answer(asks(post)[1]?.token, 'another-title');
    await vi.advanceTimersByTimeAsync(3_000);
    expect(asks(post)).toHaveLength(3);

    withChinese();
    answer(asks(post)[2]?.token, null);
    expect(await loading).toEqual([{ start: 1, end: 2, text: '字幕' }]);
  });

  it('does not wait on a player that cannot be asked at all', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();

    const loading = a.loadTrack('zh-Hans:sub:0');
    answer(asks(post)[0]?.token, 'cannot-ask');
    await expect(loading).rejects.toThrow(/not loaded by the player yet/);
    expect(asks(post)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot-ask'));
  });

  it('stops asking after fifteen seconds of a player that is never ready', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();

    const failed = expect(a.loadTrack('zh-Hans:sub:0')).rejects.toThrow(/not loaded by the player yet/);
    for (let n = 0; n < 6; n++) {
      expect(asks(post)).toHaveLength(n + 1);
      answer(asks(post)[n]?.token, 'no-player');
      await vi.advanceTimersByTimeAsync(3_000);
    }
    await failed;
    expect(asks(post)).toHaveLength(6);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no-player'));
  });

  it('stops asking when the viewer has gone on to another title', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();
    // The next episode has a track of the same name, already sent.
    manifest('222', [sent('zh-Hans', 'Chinese (Simplified)', 'T:hans', [cdn('hans222')])]);
    const fetch = serve({ [cdn('hans222')]: { body: ttml('次回') } });

    const failed = expect(a.loadTrack('zh-Hans:sub:0')).rejects.toThrow(/not loaded by the player yet/);
    history.pushState({}, '', '/watch/222');
    answer(asks(post)[0]?.token, 'no-player');
    await vi.advanceTimersByTimeAsync(3_000);
    await failed;
    // Not the other title's subtitles in this one's name.
    expect(fetch).not.toHaveBeenCalled();
    expect(asks(post)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('left'));
  });

  it('fails when the track came with nothing in it to read', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();

    const loading = a.loadTrack('zh-Hans:sub:0');
    // Sent as pictures: the hook drops the track and names its language.
    fromPage({
      source: TAG, kind: 'nf-tracks', movieId: '111', pictures: ['zh-Hans'],
      tracks: [sent('ja', 'Japanese', 'T:ja', [cdn('ja')]), waiting('ja', 'Japanese [CC]', 'T:ja-cc', { cc: true }), sent('en', 'English', 'T:en', [cdn('en')])],
    });
    answer(asks(post)[0]?.token, 'nothing-came');
    await expect(loading).rejects.toThrow(/not loaded by the player yet/);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('as pictures'));
    expect(a.pictureLanguages()).toEqual(['zh-Hans']);
    expect(await labels(a)).toEqual(['Japanese', 'Japanese [CC]', 'English']);
  });

  it('gives up on a page hook that never answers', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    first();

    const failed = expect(a.loadTrack('zh-Hans:sub:0')).rejects.toThrow(/not loaded by the player yet/);
    await vi.advanceTimersByTimeAsync(24_000);
    expect(warn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    await failed;
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no-answer'));
    // An answer that comes after all is for a request no one is waiting on.
    expect(() => answer(asks(post)[0]?.token, null)).not.toThrow();
  });

  it('waits for its own answer, not one for another request', async () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    first();
    serve({ [cdn('hans')]: { body: ttml('字幕') } });

    let done = false;
    const loading = a.loadTrack('zh-Hans:sub:0').then((cues) => {
      done = true;
      return cues;
    });
    const token = asks(post)[0]?.token as number;
    answer(token + 1, null);
    answer(String(token), null);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toBe(false);

    withChinese();
    answer(token, null);
    expect(await loading).toHaveLength(1);
  });

  it('is left out when it has no id the player could be asked by, or no language to list it under', async () => {
    const a = new NetflixAdapter();
    manifest('111', [
      sent('en', 'English', 'T:en', [cdn('en')]),
      waiting('ko', 'Korean', 'has a space'),
      waiting('', 'Nameless', 'T:x'),
      { language: 'fr', label: 'French', forced: false, cc: false, url: '', urls: [], waiting: true },
      { ...waiting('de', 'German', 'T:de'), trackId: 42 },
      // Marked as waiting, an address it carries is not taken either: it has not been sent.
      { ...waiting('it', 'Italian', 'T:it'), urls: [cdn('it')] },
    ]);
    expect(await a.listTracks()).toEqual([
      { id: 'en:sub:0', lang: 'en', label: 'English', generated: false, forced: false, cc: false },
      { id: 'it:sub:0', lang: 'it', label: 'Italian', generated: false, forced: false, cc: false, onRequest: true },
    ]);
  });
});

describe('NetflixAdapter.seek', () => {
  const lastSeek = (post: { mock: { calls: unknown[][] } }) =>
    post.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((m) => m?.kind === 'nf-seek').at(-1);

  it('asks the page hook to seek, in milliseconds', () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    a.seek(12.3456);
    expect(lastSeek(post)).toMatchObject({ source: TAG, kind: 'nf-seek', ms: 12346 });
  });

  it('leaves the <video> alone once the page hook answers', () => {
    document.body.innerHTML = '<video></video>';
    const video = document.querySelector('video')!;
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');

    a.seek(30);
    fromPage({ source: TAG, kind: 'nf-seek-done', token: lastSeek(post)?.token, via: 'api' });
    vi.advanceTimersByTime(2000);
    expect(video.currentTime).toBe(0);
  });

  it('sets currentTime itself, and says so, when the page hook never answers', () => {
    document.body.innerHTML = '<video></video>';
    const video = document.querySelector('video')!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = new NetflixAdapter();

    a.seek(30);
    vi.advanceTimersByTime(2000);
    expect(video.currentTime).toBe(30);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('M7375'));
  });

  it('falls back only for the latest seek, and not on an answer meant for an older one', () => {
    document.body.innerHTML = '<video></video>';
    const video = document.querySelector('video')!;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');

    a.seek(10);
    const older = lastSeek(post)?.token;
    a.seek(20);
    fromPage({ source: TAG, kind: 'nf-seek-done', token: older, via: 'api' });
    vi.advanceTimersByTime(2000);
    expect(video.currentTime).toBe(20);
  });

  it('does nothing for a time that is not one', () => {
    const a = new NetflixAdapter();
    const post = vi.spyOn(window, 'postMessage');
    a.seek(Number.NaN);
    a.seek(-1);
    a.seek(Number.POSITIVE_INFINITY);
    expect(lastSeek(post)).toBeUndefined();
  });
});

describe('NetflixAdapter.controlsHeight', () => {
  it('says 0, having no stable selector for the control bar', () => {
    expect(new NetflixAdapter().controlsHeight()).toBe(0);
  });
});

describe('what the player shows only while its controls are up', () => {
  const titleBar = (show: string, number: string, name: string) => {
    document.body.innerHTML =
      `<div class="watch-video--player-view"><div data-uia="video-title"><h4>${show}</h4><span>${number}</span><span>${name}</span></div></div>`;
  };

  it('reads the show and episode as separate parts, and keeps them once the bar hides', () => {
    const a = new NetflixAdapter();
    titleBar('Alice in Borderland', 'E1', 'Episode 1');
    expect(a.title()).toBe('Alice in Borderland · E1 · Episode 1');
    document.body.innerHTML = '';
    expect(a.title()).toBe('Alice in Borderland · E1 · Episode 1');
  });

  it('never names an episode with another one\'s title, nor with "Netflix"', () => {
    const a = new NetflixAdapter();
    titleBar('Alice in Borderland', 'E1', 'Episode 1');
    a.title();
    document.body.innerHTML = '';
    document.title = 'Netflix';
    history.pushState({}, '', '/watch/222');
    expect(a.title()).toBeNull();
  });

  it('measures the control bar while it is on the page, and remembers it after', () => {
    const a = new NetflixAdapter();
    document.body.innerHTML =
      '<div class="watch-video--player-view"><div data-uia="controls-standard"></div></div>';
    const root = document.querySelector('.watch-video--player-view')!;
    const bar = document.querySelector('[data-uia="controls-standard"]')!;
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 862, height: 862 } as DOMRect);
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({ top: 728, bottom: 862, height: 134 } as DOMRect);
    expect(a.controlsHeight()).toBe(134);
    bar.remove();
    expect(a.controlsHeight()).toBe(134);
  });
});
