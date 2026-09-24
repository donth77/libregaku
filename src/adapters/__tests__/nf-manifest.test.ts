import { describe, expect, it } from 'vitest';
import { tracksFrom } from '../nf-manifest';

/**
 * Both shapes are recorded from real manifests: the one this adapter was
 * written against, and the one Netflix serves now. The second went unnoticed
 * for a while because the DOM fallback kept subtitles on screen while the
 * whole transcript and the second subtitle line quietly stopped working, so
 * it is worth pinning both down.
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
  });

  it('ignores every other object that passes through JSON.parse', () => {
    for (const other of [null, 42, 'text', {}, { result: {} }, { timedtexttracks: 'no' }, { result: { textTracks: [] } }]) {
      expect(tracksFrom(other)).toBeNull();
    }
  });
});
