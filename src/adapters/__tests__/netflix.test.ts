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
