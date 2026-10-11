import { describe, expect, it } from 'vitest';
import { tracksFrom, unreadableTracks } from '../nf-manifest';

/**
 * Both shapes: the one this adapter was written against, and the one Netflix
 * serves now. The second went unnoticed for a while because the DOM fallback
 * kept subtitles on screen while the whole transcript and the second subtitle
 * line quietly stopped working, so it is worth pinning both down.
 *
 * These are hand-reduced to the fields the adapter reads, with made-up URLs —
 * not recorded manifests. They pin how we read Netflix's shape, not the shape
 * itself; a sanitised capture of a real manifest would be a better fixture.
 */

const url = (u: string) => ({ urls: [{ url: u }] });

/** As Netflix served it when the adapter was written. */
const oldShape = {
  movieId: 81234,
  timedtexttracks: [
    { language: null, isNoneTrack: true, ttDownloadables: {} },
    {
      language: 'ja',
      languageDescription: 'Japanese',
      ttDownloadables: { 'dfxp-ls-sdh': { downloadUrls: { cdn1: 'https://nf.test/ja.xml' } } },
    },
    {
      language: 'en',
      languageDescription: 'English',
      ttDownloadables: { 'dfxp-ls-sdh': url('https://nf.test/en.xml') },
    },
  ],
};

/** As Netflix serves it now. */
const newShape = {
  result: {
    movieId: 82041768,
    textTracks: [
      { language: null, languageDescription: 'Off', isNoneTrack: true, downloadables: {} },
      {
        language: 'ja',
        languageDescription: 'Japanese',
        rawTrackType: 'subtitles',
        downloadables: { 'imsc1.1': url('https://nf.test/ja.imsc'), 'nflx-cmisc': url('https://nf.test/ja.misc') },
      },
      {
        language: 'ja',
        languageDescription: 'Japanese',
        rawTrackType: 'closedcaptions',
        downloadables: { 'imsc1.1': url('https://nf.test/ja-cc.imsc') },
      },
      {
        language: 'en',
        languageDescription: 'English',
        rawTrackType: 'subtitles',
        downloadables: { 'imsc1.1': url('https://nf.test/en.imsc') },
      },
    ],
  },
};

describe('tracksFrom', () => {
  it('reads the shape Netflix serves now', () => {
    const got = tracksFrom(newShape);
    expect(got?.movieId).toBe('82041768');
    expect(got?.tracks.map((t) => t.language)).toEqual(['ja', 'ja', 'en']);
    expect(got?.tracks[0]?.url).toBe('https://nf.test/ja.imsc');
    expect(got?.tracks.map((t) => t.cc)).toEqual([false, true, false]);
  });

  it('still reads the older shape', () => {
    const got = tracksFrom(oldShape);
    expect(got?.movieId).toBe('81234');
    expect(got?.tracks.map((t) => t.language)).toEqual(['ja', 'en']);
    expect(got?.tracks[0]?.url).toBe('https://nf.test/ja.xml');
  });

  it('names the closed-captions track, so the picker does not show one label twice', () => {
    const labels = tracksFrom(newShape)?.tracks.filter((t) => t.language === 'ja').map((t) => t.label);
    expect(labels).toEqual(['Japanese', 'Japanese [CC]']);
  });

  it('prefers imsc1 over the other encodings', () => {
    const got = tracksFrom({
      result: {
        textTracks: [
          { language: 'ja', downloadables: { 'nflx-cmisc': url('https://nf.test/misc'), 'imsc1.1': url('https://nf.test/imsc') } },
        ],
      },
    });
    expect(got?.tracks[0]?.url).toBe('https://nf.test/imsc');
  });

  it('drops the none track, bitmap subtitles, and anything with no URL', () => {
    const got = tracksFrom({
      result: {
        textTracks: [
          { language: null, isNoneTrack: true, downloadables: { 'imsc1.1': url('https://nf.test/off') } },
          { language: 'de', isImageBased: true, downloadables: { 'imsc1.1': url('https://nf.test/de') } },
          { language: 'fr', downloadables: {} },
          { language: 'ja', downloadables: { 'imsc1.1': url('https://nf.test/ja') } },
        ],
      },
    });
    expect(got?.tracks.map((t) => t.language)).toEqual(['ja']);
    // The bitmaps are not read, but their language is named.
    expect(got?.pictures).toEqual(['de']);
  });

  it('answers for a title whose subtitles are all pictures, and leaves out forced ones', () => {
    const got = tracksFrom({
      result: {
        textTracks: [
          { language: 'zh-Hans', isImageBased: true, downloadables: { 'nflx-cmisc': url('https://nf.test/zh') } },
          { language: 'zh-Hans', isImageBased: true, isForcedNarrative: true, downloadables: { 'nflx-cmisc': url('https://nf.test/zf') } },
          { language: 'en', isImageBased: true, isForcedNarrative: true, downloadables: { 'nflx-cmisc': url('https://nf.test/ef') } },
        ],
      },
    });
    expect(got).toMatchObject({ tracks: [], pictures: ['zh-Hans'] });
  });

  it('ignores every other object that passes through JSON.parse', () => {
    for (const other of [null, 42, 'text', {}, { result: {} }, { timedtexttracks: 'no' }, { result: { textTracks: [] } }]) {
      expect(tracksFrom(other)).toBeNull();
    }
  });

  it('publishes every URL: best format first, then each CDN in the order listed', () => {
    const got = tracksFrom({
      result: {
        textTracks: [{
          language: 'ja',
          downloadables: {
            'webvtt-lssdh-ios8': url('https://nf.test/ja.vtt'),
            'dfxp-ls-sdh': { downloadUrls: { cdn1: 'https://nf.test/ja-1.dfxp', cdn2: 'https://nf.test/ja-2.dfxp' } },
            'imsc1.1': { urls: [{ url: 'https://nf.test/ja-a.imsc' }, { url: 'https://nf.test/ja-b.imsc' }] },
          },
        }],
      },
    });
    expect(got?.tracks[0]?.urls).toEqual([
      'https://nf.test/ja-a.imsc',
      'https://nf.test/ja-b.imsc',
      'https://nf.test/ja-1.dfxp',
      'https://nf.test/ja-2.dfxp',
      'https://nf.test/ja.vtt',
    ]);
    expect(got?.tracks[0]?.url).toBe('https://nf.test/ja-a.imsc');
  });

  it('never picks an image encoding, whatever order the keys come in', () => {
    const got = tracksFrom({
      result: {
        textTracks: [
          { language: 'ja', downloadables: { 'nflx-cmisc': url('https://nf.test/ja.cmisc'), 'dfxp-ls-sdh': url('https://nf.test/ja.dfxp') } },
          { language: 'ko', downloadables: { 'nflx-cmisc': url('https://nf.test/ko.cmisc') } },
        ],
      },
    });
    expect(got?.tracks.map((t) => t.urls)).toEqual([['https://nf.test/ja.dfxp']]);
  });

  it('survives junk inside a manifest without losing the good tracks', () => {
    const got = tracksFrom({
      result: {
        movieId: 7,
        textTracks: [
          null,
          'nonsense',
          { language: 'fr', downloadables: null },
          { language: 'de', downloadables: { 'imsc1.1': null, 'dfxp-ls-sdh': { urls: [null, { url: 42 }] } } },
          { language: 'ja', downloadables: { 'imsc1.1': { urls: [{}, { url: 'https://nf.test/ja' }] } } },
        ],
      },
    });
    expect(got?.tracks.map((t) => [t.language, t.urls])).toEqual([['ja', ['https://nf.test/ja']]]);
    expect(got?.movieId).toBe('7');
  });
});

describe('unreadableTracks', () => {
  it('names the text tracks offered only in encodings we do not know', () => {
    expect(unreadableTracks({
      result: {
        textTracks: [
          { language: 'ja', downloadables: { 'imsc2': url('https://nf.test/ja'), 'nflx-cmisc': url('https://nf.test/ja.c') } },
          { language: 'en', downloadables: { 'imsc1.1': url('https://nf.test/en') } },
          { language: 'de', isImageBased: true, downloadables: { 'nflx-cmisc': url('https://nf.test/de') } },
          { language: null, isNoneTrack: true, downloadables: {} },
        ],
      },
    })).toEqual(['ja: imsc2, nflx-cmisc']);
  });

  it('is empty when every text track is readable, and null for anything that is not a manifest', () => {
    expect(unreadableTracks(newShape)).toEqual([]);
    expect(unreadableTracks({ some: 'object' })).toBeNull();
  });
});
