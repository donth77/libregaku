import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The Netflix page hook (src/content/inject-netflix.ts): installed once,
 * reporting manifests that pass through JSON.parse, replaying them on request,
 * and seeking through the player API.
 *
 * Importing it patches the global JSON.parse, so the original goes back after.
 */

const TAG = 'libregaku';
const nativeParse = JSON.parse;
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
