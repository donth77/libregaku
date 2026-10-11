import { describe, expect, it } from 'vitest';
import { detailIdOf, readTracks } from '../prime';
import { bcp47, tracksFrom } from '../pv-resources';

const FILE = 'https://cf-timedtext.aux.pv-cdn.net/b465/0e5c/a.ttml2';

describe('tracksFrom', () => {
  const answer = {
    playbackData: {},
    timedTextUrls: {
      result: {
        subtitleUrls: [
          { displayName: 'English', format: 'TTMLv2', languageCode: 'en-us', type: 'Subtitle', url: FILE },
          { displayName: '日本語 [CC]', format: 'TTMLv2', languageCode: 'ja-jp', type: 'Sdh', url: FILE + '?ja' },
        ],
        forcedNarrativeUrls: [{ displayName: 'English', languageCode: 'en-us', type: 'Subtitle', url: FILE + '?fn' }],
      },
    },
  };

  it('lists subtitles, captions and forced narratives', () => {
    const got = tracksFrom(answer);
    expect(got?.map((t) => [t.language, t.cc, t.forced])).toEqual([
      ['en-us', false, false],
      ['ja-jp', true, false],
      ['en-us', false, true],
    ]);
    expect(got?.[1]?.label).toBe('日本語 [CC]');
  });

  it('is null for an answer that carries none, so it cannot replace one that does', () => {
    expect(tracksFrom({ timedTextUrls: { error: { code: 'Invalid' } } })).toBeNull();
    expect(tracksFrom({ timedTextUrls: { result: { subtitleUrls: [], forcedNarrativeUrls: [] } } })).toBeNull();
    expect(tracksFrom({ movieId: 1 })).toBeNull();
    expect(tracksFrom(null)).toBeNull();
  });
});

describe('bcp47', () => {
  it('upper-cases the region', () => {
    expect(bcp47('ja-jp')).toBe('ja-JP');
    expect(bcp47('en')).toBe('en');
    expect(bcp47('zh-hant')).toBe('zh-hant');
  });
});

describe('readTracks', () => {
  it('keeps Amazon-hosted https files and gives each a stable id', () => {
    const got = readTracks([
      { url: FILE, language: 'ja-jp', label: '日本語 [CC]', cc: true, forced: false },
      { url: FILE + '?2', language: 'ja-jp', label: '日本語', cc: false, forced: false },
      { url: 'https://evil.example/a.ttml2', language: 'ja-jp', label: 'x', cc: false, forced: false },
      { url: 'http://cf-timedtext.aux.pv-cdn.net/a.ttml2', language: 'en-us', label: 'x', cc: false, forced: false },
      'nonsense',
    ]);
    expect(got.map((t) => t.id)).toEqual(['ja-JP:cc:0', 'ja-JP:sub:0']);
  });

  it('is empty for anything that is not a list', () => {
    expect(readTracks({ url: FILE })).toEqual([]);
  });
});

describe('detailIdOf', () => {
  it('reads the id from a title page, with or without a region', () => {
    expect(detailIdOf('/region/na/detail/0FSCXHAJ5EZREGJUSLIHVB8VRP')).toBe('0FSCXHAJ5EZREGJUSLIHVB8VRP');
    expect(detailIdOf('/detail/ABC/ref=x')).toBe('ABC');
    expect(detailIdOf('/storefront/home')).toBeNull();
  });
});
