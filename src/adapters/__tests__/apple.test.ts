import { describe, expect, it } from 'vitest';
import { trackLanguageMatch } from '../../settings';
import { asTracks, languageOf, nativeTracksFor, titleFrom, titleIdOf } from '../apple';
import { subtitleRenditions } from '../hls';

// As a title's master playlist lists them: each language once per CDN, Mandarin as cmn.
const BASE = 'https://play-edge.itunes.apple.com/WebObjects/MZPlayLocal.woa/hls/subscription/playlist.m3u8';
const rendition = (cdn: string, language: string, name: string): string =>
  `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subtitles_vod-${cdn}-aoc.tv.apple.com",LANGUAGE="${language}",NAME="${name}",` +
  `AUTOSELECT=YES,FORCED=NO,PATHWAY-ID="${cdn}",URI="https://vod-${cdn}-aoc.tv.apple.com/itunes-assets/a/${language}_subtitles_V1.m3u8"`;
const MASTER = [
  '#EXTM3U',
  ...['ap', 'fa'].flatMap((cdn) => [
    rendition(cdn, 'cmn-Hans', '中文（简体） '),
    rendition(cdn, 'cmn-Hant', '中文（繁體） '),
    rendition(cdn, 'yue-Hant', '廣東話 '),
    rendition(cdn, 'ja', '日本語 '),
    rendition(cdn, 'no', 'norsk '),
    rendition(cdn, 'tl', 'Tagalog '),
  ]),
].join('\n');

describe('languageOf', () => {
  it('writes the playlist\'s codes as the player and the other sites do', () => {
    expect(languageOf('cmn-Hans')).toBe('zh-Hans');
    expect(languageOf('cmn-Hant')).toBe('zh-Hant');
    expect(languageOf('tl')).toBe('fil');
    expect(languageOf('no')).toBe('nb');
  });

  it('leaves the rest alone', () => {
    for (const tag of ['ja', 'ko', 'en', 'es-419', 'pt-BR', 'yue-Hant', 'zh-Hans', 'nb', 'nn']) expect(languageOf(tag)).toBe(tag);
  });

  it('passes on what is not a language tag', () => {
    expect(languageOf('')).toBe('');
    expect(languageOf('zh-cmn-Hans')).toBe('zh-cmn-Hans');
    expect(languageOf('not a tag')).toBe('not a tag');
  });
});

describe('asTracks', () => {
  const tracks = asTracks(subtitleRenditions(MASTER, BASE));

  it('lists a language once, under the code the track choice reads', () => {
    expect(tracks.map((t) => t.language)).toEqual(['zh-Hans', 'zh-Hant', 'yue-Hant', 'ja', 'nb', 'fil']);
    expect(tracks.map((t) => t.id)).toContain('zh-Hans:sub:0');
  });

  it('gives a learner of Chinese their script, and one of Cantonese the Cantonese', () => {
    const best = (want: string): string | undefined =>
      [...tracks].sort((a, b) => trackLanguageMatch(b.language, want) - trackLanguageMatch(a.language, want))[0]?.language;
    expect(best('zh-Hans')).toBe('zh-Hans');
    expect(best('zh-Hant')).toBe('zh-Hant');
    expect(best('yue')).toBe('yue-Hant');
    expect(trackLanguageMatch('zh-Hans', 'zh')).toBe(2);
  });

  it('drops a rendition served from anywhere but Apple', () => {
    const elsewhere = rendition('ap', 'ja', '日本語').replace('vod-ap-aoc.tv.apple.com/itunes', 'example.com/itunes');
    expect(asTracks(subtitleRenditions(elsewhere, BASE))).toEqual([]);
  });
});

describe('nativeTracksFor', () => {
  // The player's own list: a language several times over, under its own codes.
  const native = [
    { kind: 'subtitles', language: 'zh-Hans', label: '中文（简体）' },
    { kind: 'subtitles', language: 'zh-Hans', label: '中文（简体）' },
    { kind: 'subtitles', language: 'zh-Hant', label: '中文（繁體）' },
    { kind: 'subtitles', language: 'nb', label: 'norsk' },
    { kind: 'subtitles', language: 'ja', label: '日本語' },
    { kind: 'subtitles', language: 'ja', label: '日本語 (forced)' },
    { kind: 'metadata', language: 'ja', label: '' },
  ] as const;
  const tracks = asTracks(subtitleRenditions(MASTER, BASE));
  const of = (language: string) => {
    const track = tracks.find((t) => t.language === language);
    return track ? nativeTracksFor(track, [...native]) : [];
  };

  it('finds the player\'s tracks of a language the playlist names another way', () => {
    expect(of('zh-Hans')).toEqual([native[0], native[1]]);
    expect(of('zh-Hant')).toEqual([native[2]]);
    expect(of('nb')).toEqual([native[3]]);
  });

  it('never takes a forced track, or one that is not subtitles', () => {
    expect(of('ja')).toEqual([native[4]]);
  });

  it('goes by the name where no track has the language', () => {
    expect(nativeTracksFor({ language: 'xx', name: 'norsk ' }, [...native])).toEqual([native[3]]);
    expect(nativeTracksFor({ language: 'xx', name: '' }, [...native])).toEqual([]);
    expect(of('fil')).toEqual([]);
  });
});

describe('titleIdOf', () => {
  it('reads the id of an episode, a show and a film', () => {
    expect(titleIdOf('/us/episode/chapter-one/umc.cmc.4k8qxa0ob0jh9spx6uuy1st5q')).toBe('umc.cmc.4k8qxa0ob0jh9spx6uuy1st5q');
    expect(titleIdOf('/us/show/pachinko/umc.cmc.17vf6g68dy89kk1l1nnb6min4')).toBe('umc.cmc.17vf6g68dy89kk1l1nnb6min4');
    expect(titleIdOf('/gb/movie/some-film/umc.cmc.abc')).toBe('umc.cmc.abc');
  });

  it('is null on a page that is not a title', () => {
    expect(titleIdOf('/us')).toBeNull();
    expect(titleIdOf('/us/search')).toBeNull();
  });
});

describe('titleFrom', () => {
  it('drops the mark, the verb and the site from the page title', () => {
    // As tv.apple.com writes it, the left-to-right mark included.
    expect(titleFrom('‎Watch Chapter One - Pachinko (Season 1, Episode 1) - Apple TV')).toBe('Chapter One - Pachinko (Season 1, Episode 1)');
    expect(titleFrom('‎Watch Pachinko - Apple TV')).toBe('Pachinko');
  });

  it('still reads the name the site had before', () => {
    expect(titleFrom('Watch Severance - Apple TV+')).toBe('Severance');
  });

  it('has nothing to say on a page with only the site for a title', () => {
    expect(titleFrom('‎Apple TV')).toBeNull();
    expect(titleFrom('')).toBeNull();
  });
});
