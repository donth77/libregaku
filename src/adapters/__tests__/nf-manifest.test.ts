import { describe, expect, it } from 'vitest';
import { TEXT_PROFILE, addTextProfile, mergeFound, tracksFrom, unreadableTracks, type NfFound } from '../nf-manifest';

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

  it('reads a track Netflix draws as pictures when it comes with its words as WebVTT', () => {
    // What the manifest holds once text was asked for too (addTextProfile):
    // both Chinese tracks still flagged as pictures, each with a WebVTT file.
    const got = tracksFrom({
      result: {
        movieId: 80200575,
        textTracks: [
          { language: 'zh-Hans', languageDescription: 'Simplified Chinese', isImageBased: true,
            downloadables: { 'nflx-cmisc': url('https://nf.test/hans.img'), 'webvtt-lssdh-ios8': url('https://nf.test/hans.vtt') } },
          { language: 'zh-Hant', languageDescription: 'Traditional Chinese', isImageBased: true,
            downloadables: { 'webvtt-lssdh-ios8': url('https://nf.test/hant.vtt'), 'nflx-cmisc': url('https://nf.test/hant.img') } },
          { language: 'ko', isImageBased: true, downloadables: { 'nflx-cmisc': url('https://nf.test/ko.img') } },
          { language: 'ja', downloadables: { 'imsc1.1': url('https://nf.test/ja.imsc'), 'webvtt-lssdh-ios8': url('https://nf.test/ja.vtt') } },
        ],
      },
    });
    expect(got?.tracks.map((t) => [t.language, t.label, t.urls])).toEqual([
      // Never the pictures, whatever else such a track lists.
      ['zh-Hans', 'Simplified Chinese', ['https://nf.test/hans.vtt']],
      ['zh-Hant', 'Traditional Chinese', ['https://nf.test/hant.vtt']],
      // A text track keeps its better format first, with WebVTT to fall back on.
      ['ja', 'ja', ['https://nf.test/ja.imsc', 'https://nf.test/ja.vtt']],
    ]);
    // Only what has no words at all is still called pictures.
    expect(got?.pictures).toEqual(['ko']);
  });

  it('does not call a language pictures when another of its tracks can be read', () => {
    const got = tracksFrom({
      result: {
        textTracks: [
          { language: 'zh-Hans', isImageBased: true, downloadables: { 'nflx-cmisc': url('https://nf.test/img') } },
          { language: 'zh-Hans', rawTrackType: 'closedcaptions', downloadables: { 'imsc1.1': url('https://nf.test/cc') } },
          // A forced track that can be read is no answer for the language's subtitles.
          { language: 'zh-Hant', isForcedNarrative: true, downloadables: { 'imsc1.1': url('https://nf.test/forced') } },
          { language: 'zh-Hant', isImageBased: true, downloadables: { 'nflx-cmisc': url('https://nf.test/img2') } },
        ],
      },
    });
    expect(got?.tracks.map((t) => `${t.language}${t.cc ? ' cc' : ''}${t.forced ? ' forced' : ''}`)).toEqual(['zh-Hans cc', 'zh-Hant forced']);
    expect(got?.pictures).toEqual(['zh-Hant']);
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

/**
 * The shape read from the player's bundle on 2026-10-11 (supportsPartialHydration,
 * hydrated, replaceDehydratedTracks), not from a recorded manifest: the web
 * player is sent a few tracks with their files and the rest by name.
 */
describe('tracks Netflix lists and has not sent', () => {
  /** A title as the player first gets it: Japanese and English with files, the rest named. */
  const first = {
    result: {
      movieId: 81035908,
      textTracks: [
        { id: 'T:none', isNoneTrack: true, hydrated: true, downloadables: {} },
        { id: 'T:ja', language: 'ja', languageDescription: 'Japanese', rawTrackType: 'subtitles', hydrated: true,
          downloadables: { 'imsc1.1': url('https://nf.test/ja.imsc') } },
        { id: 'T:ja-cc', language: 'ja', languageDescription: 'Japanese', rawTrackType: 'closedcaptions', hydrated: false },
        { id: 'T:zh-Hans', language: 'zh-Hans', languageDescription: 'Chinese (Simplified)', rawTrackType: 'subtitles', hydrated: false },
        { id: 'T:zh-Hant', language: 'zh-Hant', languageDescription: 'Chinese (Traditional)', rawTrackType: 'subtitles', hydrated: false },
        { id: 'T:en', language: 'en', languageDescription: 'English', rawTrackType: 'subtitles', hydrated: true,
          downloadables: { 'imsc1.1': url('https://nf.test/en.imsc') } },
        // The few lines of on-screen writing, for another audio language: nobody asks for these.
        { id: 'T:es-forced', language: 'es', languageDescription: 'Spanish', isForcedNarrative: true, hydrated: false },
        // No id to ask the player by, or no language to offer it under.
        { language: 'ko', languageDescription: 'Korean', hydrated: false },
        { id: 'T:unnamed', hydrated: false },
      ],
    },
  };

  /** What the player gets back after asking for Simplified Chinese: that track's files, and the others named again. */
  const answer = {
    result: {
      movieId: 81035908,
      textTracks: [
        { id: 'T:none', isNoneTrack: true, hydrated: true, downloadables: {} },
        { id: 'T:ja', language: 'ja', languageDescription: 'Japanese', rawTrackType: 'subtitles', hydrated: false },
        { id: 'T:ja-cc', language: 'ja', languageDescription: 'Japanese', rawTrackType: 'closedcaptions', hydrated: false },
        { id: 'T:zh-Hans', language: 'zh-Hans', languageDescription: 'Chinese (Simplified)', rawTrackType: 'subtitles', hydrated: true,
          downloadables: { 'imsc1.1': url('https://nf.test/hans.imsc') } },
        { id: 'T:zh-Hant', language: 'zh-Hant', languageDescription: 'Chinese (Traditional)', rawTrackType: 'subtitles', hydrated: false },
        { id: 'T:en', language: 'en', languageDescription: 'English', rawTrackType: 'subtitles', hydrated: true,
          downloadables: { 'imsc1.1': url('https://nf.test/en-2.imsc') } },
      ],
    },
  };

  const found = (manifest: unknown): NfFound => {
    const got = tracksFrom(manifest);
    if (!got) throw new Error('not read as a manifest');
    return got;
  };
  /** A list as "language[ cc]: its first URL, or waiting". */
  const said = (f: NfFound): string[] =>
    f.tracks.map((t) => `${t.language}${t.cc ? ' cc' : ''}: ${t.waiting ? 'waiting' : t.url}`);

  it('keeps them in the list, in their place, with the id to ask the player by', () => {
    const got = found(first);
    expect(said(got)).toEqual([
      'ja: https://nf.test/ja.imsc',
      'ja cc: waiting',
      'zh-Hans: waiting',
      'zh-Hant: waiting',
      'en: https://nf.test/en.imsc',
    ]);
    expect(got.tracks[2]).toEqual({
      url: '', urls: [], language: 'zh-Hans', label: 'Chinese (Simplified)', forced: false, cc: false, trackId: 'T:zh-Hans', waiting: true,
    });
    expect(got.tracks[1]).toMatchObject({ label: 'Japanese [CC]', cc: true, waiting: true });
    // A track that came with its files says nothing of waiting.
    expect(got.tracks[0]).toEqual({
      url: 'https://nf.test/ja.imsc', urls: ['https://nf.test/ja.imsc'], language: 'ja', label: 'Japanese', forced: false, cc: false, trackId: 'T:ja',
    });
    expect(got).toMatchObject({ movieId: '81035908', pictures: [], unreadable: [] });
  });

  it('is still a manifest when every track is waiting', () => {
    const got = tracksFrom({ result: { movieId: 7, textTracks: [{ id: 'T:ko', language: 'ko', hydrated: false }] } });
    expect(got?.tracks).toEqual([{ url: '', urls: [], language: 'ko', label: 'ko', forced: false, cc: false, trackId: 'T:ko', waiting: true }]);
  });

  it('reads closed captions whichever way the word is written', () => {
    const got = found({ result: { textTracks: [
      { id: 1, language: 'en', rawTrackType: 'CLOSEDCAPTIONS', downloadables: { 'imsc1.1': url('https://nf.test/cc') } },
    ] } });
    expect(got.tracks[0]).toMatchObject({ cc: true, label: 'en [CC]', trackId: '1' });
  });

  it('does not call a language pictures before its files were sent', () => {
    // Flagged as drawn from pictures, and nothing sent yet: with text asked for too, its words may come.
    const got = found({ result: { textTracks: [
      { id: 'T:zh', language: 'zh-Hans', isImageBased: true, hydrated: false },
      { id: 'T:en', language: 'en', downloadables: { 'imsc1.1': url('https://nf.test/en') } },
    ] } });
    expect(got.pictures).toEqual([]);
    expect(got.tracks[0]).toMatchObject({ language: 'zh-Hans', waiting: true });
  });

  describe('once the player has asked for one', () => {
    it('takes the track that came, and keeps the files sent before', () => {
      const merged = mergeFound(found(first), found(answer));
      expect(said(merged)).toEqual([
        // Named again without its files: the ones sent first still stand.
        'ja: https://nf.test/ja.imsc',
        'ja cc: waiting',
        'zh-Hans: https://nf.test/hans.imsc',
        'zh-Hant: waiting',
        // Sent again: the newer files.
        'en: https://nf.test/en-2.imsc',
      ]);
      expect(merged.tracks[2]).not.toHaveProperty('waiting');
      expect(merged.movieId).toBe('81035908');
    });

    it('leaves every track in its place, which is how the adapter names it', () => {
      const before = found(first).tracks.map((t) => t.trackId);
      expect(mergeFound(found(first), found(answer)).tracks.map((t) => t.trackId)).toEqual(before);
      // And the same again when the answer is read twice.
      const once = mergeFound(found(first), found(answer));
      expect(mergeFound(once, found(answer))).toEqual(once);
    });

    it('adds a track the first manifest did not name, after the others', () => {
      const more = { result: { movieId: 81035908, textTracks: [
        { id: 'T:ko', language: 'ko', languageDescription: 'Korean', hydrated: true, downloadables: { 'imsc1.1': url('https://nf.test/ko') } },
      ] } };
      const merged = mergeFound(found(first), found(more));
      expect(said(merged)).toEqual([...said(found(first)), 'ko: https://nf.test/ko']);
    });

    it('drops a track that came as pictures alone, and says so of its language', () => {
      const pictures = { result: { movieId: 81035908, textTracks: [
        { id: 'T:zh-Hans', language: 'zh-Hans', isImageBased: true, hydrated: true, downloadables: { 'nflx-cmisc': url('https://nf.test/hans.img') } },
        { id: 'T:zh-Hant', language: 'zh-Hant', hydrated: false },
      ] } };
      const merged = mergeFound(found(first), found(pictures));
      expect(said(merged)).toEqual(['ja: https://nf.test/ja.imsc', 'ja cc: waiting', 'zh-Hant: waiting', 'en: https://nf.test/en.imsc']);
      expect(merged.pictures).toEqual(['zh-Hans']);
      expect(merged.unreadable).toEqual(['T:zh-Hans']);

      // Named again as waiting by a later manifest, it is not offered again: asking brings the same pictures.
      const later = mergeFound(merged, found(first));
      expect(said(later)).toEqual(said(merged));
      expect(later.pictures).toEqual(['zh-Hans']);
    });

    it('stops calling a language pictures once one of its tracks can be read', () => {
      const older: NfFound = { tracks: [], movieId: '9', pictures: ['zh-Hans', 'ko'], unreadable: ['T:zh', 'T:ko'] };
      const newer = found({ result: { movieId: 9, textTracks: [
        { id: 'T:zh', language: 'zh-Hans', isImageBased: true, downloadables: { 'webvtt-lssdh-ios8': url('https://nf.test/zh.vtt') } },
      ] } });
      expect(mergeFound(older, newer)).toEqual({
        tracks: [{ url: 'https://nf.test/zh.vtt', urls: ['https://nf.test/zh.vtt'], language: 'zh-Hans', label: 'zh-Hans', forced: false, cc: false, trackId: 'T:zh' }],
        movieId: '9',
        pictures: ['ko'],
        unreadable: ['T:ko'],
      });
    });

    it('keeps a track that was read when a later manifest sends it with nothing to read', () => {
      const worse = { result: { movieId: 81035908, textTracks: [
        { id: 'T:ja', language: 'ja', isImageBased: true, hydrated: true, downloadables: { 'nflx-cmisc': url('https://nf.test/ja.img') } },
      ] } };
      const merged = mergeFound(found(first), found(worse));
      expect(said(merged)[0]).toBe('ja: https://nf.test/ja.imsc');
      expect(merged.pictures).toEqual([]);
    });
  });

  describe('and what is not merged', () => {
    it('is another title', () => {
      const other = found({ result: { movieId: 70000001, textTracks: [
        { id: 'T:en', language: 'en', downloadables: { 'imsc1.1': url('https://nf.test/other') } },
      ] } });
      expect(mergeFound(found(first), other)).toBe(other);
    });

    it('is a manifest with no title named', () => {
      const a = found({ result: { textTracks: [{ id: 'T:en', language: 'en', downloadables: { 'imsc1.1': url('https://nf.test/a') } }] } });
      const b = found({ result: { textTracks: [{ id: 'T:ja', language: 'ja', downloadables: { 'imsc1.1': url('https://nf.test/b') } }] } });
      expect(mergeFound(a, b)).toBe(b);
    });

    it('is a manifest of the older shape, whose tracks carry no ids: it is whole in itself', () => {
      const whole = { movieId: 81234, timedtexttracks: [
        { language: 'ja', ttDownloadables: { 'dfxp-ls-sdh': url('https://nf.test/ja.xml') } },
        { language: 'en', ttDownloadables: { 'dfxp-ls-sdh': url('https://nf.test/en.xml') } },
      ] };
      const again = { movieId: 81234, timedtexttracks: [
        { language: 'ja', ttDownloadables: { 'dfxp-ls-sdh': url('https://nf.test/ja-2.xml') } },
      ] };
      expect(said(mergeFound(found(whole), found(again)))).toEqual(['ja: https://nf.test/ja-2.xml']);
    });

    it('is the first manifest of a title', () => {
      const got = found(first);
      expect(mergeFound(undefined, got)).toBe(got);
    });
  });
});

describe('asking Netflix for text as well', () => {
  /** The player's manifest request, reduced to what is read of it. */
  const request = (profiles: unknown[]) => ({
    version: 2,
    url: 'licensedManifest',
    params: { type: 'standard', viewableId: 80200575, profiles, showAllSubDubTracks: false },
  });

  it('adds WebVTT to the formats the player asks for, and takes none of them out', () => {
    const asked = ['heaac-2-dash', 'playready-h264mpl30-dash', 'dfxp-ls-sdh', 'simplesdh', 'nflx-cmisc', 'imsc1.1', 'BIF240'];
    const r = request([...asked]);
    expect(addTextProfile(r)).toBe(true);
    expect(r.params.profiles).toEqual([TEXT_PROFILE, ...asked]);
    // Nothing else in the request is touched.
    expect(r).toMatchObject({ version: 2, url: 'licensedManifest', params: { viewableId: 80200575, showAllSubDubTracks: false } });
  });

  it('asks once: a request that already names it is left as it is', () => {
    const r = request(['dfxp-ls-sdh', TEXT_PROFILE, 'nflx-cmisc']);
    expect(addTextProfile(r)).toBe(false);
    expect(r.params.profiles).toEqual(['dfxp-ls-sdh', TEXT_PROFILE, 'nflx-cmisc']);
  });

  it('finds the formats on the request itself as well as under params', () => {
    const r = { profiles: ['simplesdh', 'heaac-2-dash'] };
    expect(addTextProfile(r)).toBe(true);
    expect(r.profiles[0]).toBe(TEXT_PROFILE);
  });

  it('touches nothing that is not a manifest request', () => {
    // Everything else the page stringifies: logs, settings, requests with no subtitle formats in them.
    const others: unknown[] = [
      null, undefined, 7, 'profiles', [], ['dfxp-ls-sdh'], {},
      { params: {} }, { params: { profiles: 'dfxp-ls-sdh' } }, { params: { profiles: [] } },
      { params: { profiles: ['heaac-2-dash', 'playready-h264mpl30-dash'] } },
      { params: { profiles: ['dfxp-ls-sdh', 7] } },
      { profiles: [{ name: 'Tom' }, { name: 'Kids' }] },
    ];
    for (const other of others) {
      const before = JSON.stringify(other);
      expect(addTextProfile(other)).toBe(false);
      expect(JSON.stringify(other)).toBe(before);
    }
  });
});
