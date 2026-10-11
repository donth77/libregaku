import { describe, expect, it } from 'vitest';
import {
  AUDIO_CMN, COMMONS_API, COMMONS_FILES,
  askable, audioCmnUrl, creditOf, filesIn, linguaLibreOf, linguaLibreSearch, mp3Of, namedOf, namedQuery, namedTitle,
} from '../recordings';

/**
 * Finding a free recording of a word: the questions asked of Wikimedia
 * Commons and how its answers are read. The answers below are cut down from
 * what Commons returned on 2026-10-11, in the order it returned them; the
 * canaries ask the real thing (tests/contract/audio.contract.test.ts).
 */

const page = (
  title: string, index: number, path: string, licence: string, artist: string,
): Record<string, unknown> => ({
  pageid: 1000 + index,
  ns: 6,
  title,
  index,
  imageinfo: [{
    url: `https://upload.wikimedia.org/wikipedia/commons/${path}?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original`,
    descriptionurl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, '_')}`,
    extmetadata: { LicenseShortName: { value: licence, source: 'commons-desc-page' }, Artist: { value: artist, source: 'commons-desc-page' } },
  }],
});

/** What a search for "casa" in Spanish returned: four speakers, not in rank order. */
const CASA = {
  batchcomplete: true,
  query: {
    pages: [
      page('File:LL-Q1321 (spa)-Julie Samothrace-casa.wav', 1, 'c/c1/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav', 'CC BY-SA 4.0',
        '<ul><li>Speaker: <a href="//lingualibre.org/wiki/Q562375" class="extiw" title="lingualibre:Q562375">Julie Samothrace</a></li>\n<li>Recorder: Julie Samothrace</li></ul>'),
      page('File:LL-Q1321 (spa)-Rachlel-casa.wav', 4, 'b/bd/LL-Q1321_%28spa%29-Rachlel-casa.wav', 'CC0', '<ul><li>Speaker: Rachlel</li></ul>'),
      page('File:LL-Q1321 (spa)-GlyphEnjoyer-casa.wav', 2, '2/2c/LL-Q1321_%28spa%29-GlyphEnjoyer-casa.wav', 'CC0', '<ul><li>Speaker: GlyphEnjoyer</li></ul>'),
      page('File:LL-Q1321 (spa)-Precision27-casa.wav', 3, '8/86/LL-Q1321_%28spa%29-Precision27-casa.wav', 'CC BY 4.0', '<ul><li>Speaker: Precision27</li></ul>'),
    ],
  },
};

/** What asking for three Korean files by name returned: two there, one not. */
const KOREAN = {
  batchcomplete: true,
  query: {
    pages: [
      { ns: 6, title: 'File:Ko-없는단어.ogg', missing: true, known: true },
      page('File:Ko-사람.ogg', 0, '8/89/Ko-%EC%82%AC%EB%9E%8C.ogg', 'CC BY-SA 4.0',
        '<a href="//commons.wikimedia.org/wiki/User:HappyMidnight" title="User:HappyMidnight">HappyMidnight</a>'),
    ],
  },
};

describe('a word a recording can be asked for', () => {
  it('is a dictionary word in any script, with the marks a word is written with', () => {
    for (const word of ['casa', 'niño', 'está', '図書館', '图书馆', '먹다', 'buenos días', "l'eau", 'ex-presidente', 'aujourd’hui', 'e'.repeat(60)]) {
      expect(askable(word), word).toBe(true);
    }
  });

  it('is nothing that would mean something of its own in a search', () => {
    for (const word of ['', ' casa', 'casa.wav', 'a|b', 'ca*sa', '(casa)', 'casa"', 'ca/sa', 'ca\\sa', '-casa', '¿qué?', '3', 'e'.repeat(61), 'casa\nincategory:x']) {
      expect(askable(word), JSON.stringify(word)).toBe(false);
    }
  });
});

describe('the questions asked of Commons', () => {
  const asked = (url: string): Record<string, string> => Object.fromEntries(new URL(url).searchParams);

  it("search Lingua Libre's category of a language for a title ending in the word", () => {
    const url = linguaLibreSearch('casa', 'spa');
    expect(url.startsWith(COMMONS_API)).toBe(true);
    expect(asked(url)).toEqual({
      action: 'query', format: 'json', formatversion: '2',
      prop: 'imageinfo', iiprop: 'url|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist',
      generator: 'search', gsrnamespace: '6', gsrlimit: '10',
      gsrsearch: 'intitle:/-casa\\.wav/i incategory:"Lingua_Libre_pronunciation-spa"',
    });
    expect(asked(linguaLibreSearch('图书馆', 'cmn')).gsrsearch).toBe('intitle:/-图书馆\\.wav/i incategory:"Lingua_Libre_pronunciation-cmn"');
  });

  it('ask for a file by its name', () => {
    expect(namedTitle('Ko', '사람')).toBe('File:Ko-사람.ogg');
    const url = namedQuery(namedTitle('Ko', '사람'));
    expect(url.startsWith(COMMONS_API)).toBe(true);
    expect(asked(url)).toMatchObject({ action: 'query', titles: 'File:Ko-사람.ogg', prop: 'imageinfo', iiprop: 'url|extmetadata' });
    expect(asked(url)).not.toHaveProperty('generator');
  });

  it('write a word the one way, however its accents were typed', () => {
    // "é" as one character and as "e" with a combining accent are the same word.
    expect(linguaLibreSearch('café', 'spa')).toBe(linguaLibreSearch('café', 'spa'));
    expect(namedTitle('Ko', '사람')).toBe('File:Ko-사람.ogg');
  });
});

describe("reading Commons' answer", () => {
  it('lists the files best first, each with its address, page, licence and maker', () => {
    const files = filesIn(CASA);
    expect(files.map((f) => f.rank)).toEqual([1, 2, 3, 4]);
    expect(files[0]).toEqual({
      title: 'File:LL-Q1321 (spa)-Julie Samothrace-casa.wav',
      rank: 1,
      // Without what Commons adds to say where the address was got from.
      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav',
      page: 'https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Julie_Samothrace-casa.wav',
      licence: 'CC BY-SA 4.0',
      artist: 'Speaker: Julie Samothrace Recorder: Julie Samothrace',
    });
  });

  it('leaves out a file that is not there', () => {
    const files = filesIn(KOREAN);
    expect(files.map((f) => f.title)).toEqual(['File:Ko-사람.ogg']);
    expect(files[0]).toMatchObject({ licence: 'CC BY-SA 4.0', artist: 'HappyMidnight' });
  });

  it('holds nothing when the search found nothing, or the answer is not one', () => {
    for (const answer of [{ batchcomplete: true }, null, 'no', 42, [], { query: {} }, { query: { pages: 'none' } }, { error: { code: 'ratelimited' } }]) {
      expect(filesIn(answer)).toEqual([]);
    }
  });

  it('leaves out a file it could not fetch or could not credit', () => {
    const good = page('File:LL-Q1321 (spa)-A-sol.wav', 1, 'a/ab/x.wav', 'CC0', 'A');
    const bad = (change: (info: Record<string, unknown>) => void): Record<string, unknown> => {
      const p = page('File:LL-Q1321 (spa)-B-sol.wav', 2, 'b/bc/y.wav', 'CC0', 'B');
      change((p.imageinfo as Array<Record<string, unknown>>)[0]!);
      return p;
    };
    const files = filesIn({ query: { pages: [
      good,
      bad((info) => { info.url = 'https://evil.example/wikipedia/commons/b/bc/y.wav'; }),
      bad((info) => { info.url = 42; }),
      bad((info) => { info.descriptionurl = 'https://evil.example/wiki/File:y.wav'; }),
      bad((info) => { info.extmetadata = {}; }),
      bad((info) => { info.extmetadata = { LicenseShortName: { value: '   ' } }; }),
      { title: 'File:LL-Q1321 (spa)-C-sol.wav', index: 3 },
      { title: 42, imageinfo: [] },
      'not a page',
    ] } });
    expect(files.map((f) => f.title)).toEqual(['File:LL-Q1321 (spa)-A-sol.wav']);
  });

  it("reads a maker's name out of the page's markup, and keeps a long one short", () => {
    const [file] = filesIn({ query: { pages: [
      page('File:Ko-길.ogg', 1, 'a/ab/Ko-x.ogg', '<b>CC&nbsp;BY-SA 4.0</b>', `<a href="//x">Tom &amp; Jerry&#039;s &quot;studio&quot;</a>${' and friends'.repeat(20)}`),
    ] } });
    expect(file?.licence).toBe('CC BY-SA 4.0');
    expect(file?.artist.startsWith(`Tom & Jerry's "studio" and friends`)).toBe(true);
    expect(file?.artist.length).toBeLessThanOrEqual(80);
  });
});

describe("Lingua Libre's recording of a word", () => {
  const titled = (...titles: string[]) =>
    filesIn({ query: { pages: titles.map((t, i) => page(t, i + 1, `a/ab/f${i}.wav`, 'CC0', 'x')) } });

  it('is the best ranked one, with the speaker its name gives', () => {
    const hit = linguaLibreOf(filesIn(CASA), 'casa', 'spa');
    expect(hit?.speaker).toBe('Julie Samothrace');
    expect(hit?.file.licence).toBe('CC BY-SA 4.0');
  });

  it('is in the language asked for, though the same word is recorded in others', () => {
    const files = titled('File:LL-Q652 (ita)-Luca-casa.wav', 'File:LL-Q5146 (por)-Ana-casa.wav', 'File:LL-Q1321 (spa)-Millars-casa.wav');
    expect(linguaLibreOf(files, 'casa', 'spa')?.speaker).toBe('Millars');
    expect(linguaLibreOf(files, 'casa', 'cat')).toBeNull();
  });

  it("takes GlyphEnjoyer's recording only when no one else has recorded the word", () => {
    const both = titled('File:LL-Q1321 (spa)-GlyphEnjoyer-llegar.wav', 'File:LL-Q1321 (spa)-AdrianAbdulBaha-llegar.wav');
    expect(linguaLibreOf(both, 'llegar', 'spa')?.speaker).toBe('AdrianAbdulBaha');
    const only = titled('File:LL-Q1321 (spa)-GlyphEnjoyer-llegar.wav');
    expect(linguaLibreOf(only, 'llegar', 'spa')?.speaker).toBe('GlyphEnjoyer');
  });

  it('ends in the whole word, not in a longer word that ends the same', () => {
    // The search asks for "-casa.wav" anywhere in a title.
    const files = titled('File:LL-Q1321 (spa)-Ana-escasa.wav', 'File:LL-Q1321 (spa)-casa.wav', 'File:Es-casa.wav', 'File:LL-Q1321 (spa)-Ana-casa.ogg');
    expect(linguaLibreOf(files, 'casa', 'spa')).toBeNull();
  });

  it('takes a speaker and a word with hyphens and spaces in them', () => {
    expect(linguaLibreOf(titled('File:LL-Q1321 (spa)-Jean-Luc P-ex-presidente.wav'), 'ex-presidente', 'spa')?.speaker).toBe('Jean-Luc P');
    expect(linguaLibreOf(titled('File:LL-Q1321 (spa)-Ana B-buenos días.wav'), 'buenos días', 'spa')?.speaker).toBe('Ana B');
    expect(linguaLibreOf(titled('File:LL-Q9176 (kor)-호로조-먹다.wav'), '먹다', 'kor')?.speaker).toBe('호로조');
  });

  it('is the same word whatever its capitals, or how its accents were typed', () => {
    expect(linguaLibreOf(titled('File:LL-Q1321 (spa)-Ana-España.wav'), 'españa', 'spa')?.speaker).toBe('Ana');
    expect(linguaLibreOf(titled('File:LL-Q1321 (spa)-Ana-café.wav'), 'café', 'spa')?.speaker).toBe('Ana');
  });

  it('is none when nothing in the answer is', () => {
    expect(linguaLibreOf([], 'casa', 'spa')).toBeNull();
    expect(linguaLibreOf(filesIn(KOREAN), '사람', 'kor')).toBeNull();
  });
});

describe('a recording named for its word', () => {
  it('is the file with exactly that name', () => {
    const files = filesIn(KOREAN);
    expect(namedOf(files, 'File:Ko-사람.ogg')?.artist).toBe('HappyMidnight');
    expect(namedOf(files, 'File:Ko-사람들.ogg')).toBeNull();
    expect(namedOf(files, 'File:Ko-없는단어.ogg')).toBeNull();
  });

  it('is found however Commons writes the spaces in its name', () => {
    const files = filesIn({ query: { pages: [page('File:Ko-한국 사람.ogg', 1, 'a/ab/x.ogg', 'CC0', 'x')] } });
    expect(namedOf(files, 'File:Ko-한국_사람.ogg')).not.toBeNull();
  });
});

describe('the MP3 Commons makes of a recording', () => {
  it('is beside the file, under its own name', () => {
    expect(mp3Of('https://upload.wikimedia.org/wikipedia/commons/c/c1/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav'))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c1/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav.mp3');
    expect(mp3Of(`${COMMONS_FILES}8/89/Ko-%EC%82%AC%EB%9E%8C.ogg`))
      .toBe(`${COMMONS_FILES}transcoded/8/89/Ko-%EC%82%AC%EB%9E%8C.ogg/Ko-%EC%82%AC%EB%9E%8C.ogg.mp3`);
  });

  it('is not made up for an address that is not a Commons file', () => {
    for (const url of [
      'https://evil.example/wikipedia/commons/c/c1/x.wav',
      `${COMMONS_FILES}transcoded/c/c1/x.wav/x.wav.mp3`,
      `${COMMONS_FILES}c/c1/../../x.wav`,
      `${COMMONS_FILES}c/c1/x.wav?download`,
      `${COMMONS_FILES}thumb/c/c1/x.png/120px-x.png`,
    ]) expect(mp3Of(url), url).toBeNull();
  });
});

describe('who a recording is credited to', () => {
  it("is the speaker in a Lingua Libre file's name, with the file's own licence and page", () => {
    const hit = linguaLibreOf(filesIn(CASA), 'casa', 'spa')!;
    expect(creditOf(hit.file, hit.speaker)).toEqual({
      by: 'Julie Samothrace',
      licence: 'CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Julie_Samothrace-casa.wav',
    });
  });

  it('is whoever the page says made it otherwise, or Commons when it does not say', () => {
    const [file] = filesIn(KOREAN);
    expect(creditOf(file!)).toMatchObject({ by: 'HappyMidnight', licence: 'CC BY-SA 4.0' });
    expect(creditOf({ ...file!, artist: '' }).by).toBe('Wikimedia Commons');
  });
});

describe("audio-cmn's file for a Chinese word", () => {
  it('is named by its characters, at one commit of the repository', () => {
    expect(audioCmnUrl('图书馆')).toBe(`${AUDIO_CMN}cmn-%E5%9B%BE%E4%B9%A6%E9%A6%86.mp3`);
    expect(AUDIO_CMN).toMatch(/^https:\/\/raw\.githubusercontent\.com\/hugolpz\/audio-cmn\/[0-9a-f]{40}\/64k\/hsk\/$/);
  });

  it('is not asked for anything but a few Chinese characters', () => {
    for (const word of ['', 'library', '图书馆!', '../x', 'ㄅㄆ', '한국', '一'.repeat(9)]) expect(audioCmnUrl(word), word).toBeNull();
  });
});
