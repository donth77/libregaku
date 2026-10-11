/**
 * Free recordings of single words, and how to find one.
 *
 * Nothing here asks for anything: these are the addresses to ask and how to
 * read what comes back. The asking goes through the service worker
 * (pronounce.ts), and the canaries ask the same addresses
 * (tests/contract/audio.contract.test.ts).
 *
 * Wikimedia Commons holds two kinds. Lingua Libre's are recorded word by word
 * by volunteers, and named for the language, the speaker and the word:
 *
 *   File:LL-Q1321 (spa)-Julie Samothrace-casa.wav
 *
 * The speaker cannot be guessed, so one is found by searching the language's
 * category for a title that ends in the word. Wiktionary's older recordings
 * are named for the word alone (File:Ko-사람.ogg) and asked for by that name.
 * Each file states its own licence, CC BY-SA 4.0 for most and CC BY or CC0
 * for the rest, and that goes with the recording as its credit.
 *
 * For Chinese there is also the HSK word list read by one speaker, Yue Tan,
 * at the University of Caen in 2009 (the Shtooka collection cmn-caen-tan,
 * CC BY-SA 3.0 US), kept as MP3s in the audio-cmn repository.
 *
 * Measured on 2026-10-11 against each language's most common dictionary
 * words: of the first thousand, Lingua Libre has 95% in Spanish, 55% in
 * Mandarin and 22% in Korean; the Ko- files 31% in Korean; audio-cmn 80% in
 * Mandarin. KRDict's own recordings cover 98% of Korean and are not used:
 * its site says their terms are set file by file, and states none.
 */

/** Who made a recording and under what licence: said wherever the recording goes. */
export interface Credit {
  /** The speaker, as the source names them. */
  by: string;
  /** The licence's short name, as the source writes it: "CC BY-SA 4.0". */
  licence: string;
  /** The page with the recording and its terms. */
  page: string;
}

/** Commons' query API. Every question asked of it starts here. */
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php?';
/** Where Commons keeps its files, and the MP3s it makes of them. */
export const COMMONS_FILES = 'https://upload.wikimedia.org/wikipedia/commons/';
const COMMONS_PAGES = 'https://commons.wikimedia.org/wiki/File:';

/** Lingua Libre's name for a language, in its file names and categories: ISO 639-3. */
export const LINGUA_LIBRE: Readonly<Record<string, string>> = { es: 'spa', zh: 'cmn', ko: 'kor' };

/** The start of the name of Wiktionary's own recordings of a language, where they are named for the word alone. */
export const NAMED: Readonly<Record<string, string>> = { ko: 'Ko' };

/**
 * audio-cmn's HSK words, at the commit read on 2026-10-11: a name on a branch
 * can come to hold something else, and a commit cannot.
 */
export const AUDIO_CMN =
  'https://raw.githubusercontent.com/hugolpz/audio-cmn/ff9ed3d0c631195bd2c06f39450f3264c7124040/64k/hsk/';

/** As the collection's own readme has it: "Copyright (c) 2009 Yue Tan", CC BY-SA 3.0 United States. */
export const AUDIO_CMN_CREDIT: Credit = {
  by: 'Yue Tan',
  licence: 'CC BY-SA 3.0 US',
  page: 'https://github.com/hugolpz/audio-cmn#license',
};

/**
 * A word a recording can be asked for by: letters of any script, with the
 * marks, digits, spaces, hyphens and apostrophes a word is written with.
 * Anything else is not a dictionary word, and in a search it would mean
 * something of its own.
 */
const WORD = /^[\p{L}\p{M}][\p{L}\p{M}\p{N} '’·-]{0,59}$/u;

export function askable(word: string): boolean {
  return WORD.test(word.normalize('NFC'));
}

/** What every question asks back: each file's address, its page, its licence and who made it. */
const WANTED = {
  action: 'query',
  format: 'json',
  formatversion: '2',
  prop: 'imageinfo',
  iiprop: 'url|extmetadata',
  iiextmetadatafilter: 'LicenseShortName|Artist',
};

/**
 * The search for Lingua Libre's recordings of a word. `iso` is the language's
 * name there (LINGUA_LIBRE). The word must be askable(): nothing it may hold
 * means anything in the pattern, which is why the pattern needs no escaping
 * beyond the full stop of ".wav".
 */
export function linguaLibreSearch(word: string, iso: string): string {
  return COMMONS_API + new URLSearchParams({
    ...WANTED,
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '10',
    gsrsearch: `intitle:/-${word.normalize('NFC')}\\.wav/i incategory:"Lingua_Libre_pronunciation-${iso}"`,
  }).toString();
}

/** The name of Wiktionary's own recording of a word: "File:Ko-사람.ogg". */
export function namedTitle(prefix: string, word: string): string {
  return `File:${prefix}-${word.normalize('NFC')}.ogg`;
}

/** The question about one file, by its name. */
export function namedQuery(title: string): string {
  return COMMONS_API + new URLSearchParams({ ...WANTED, titles: title }).toString();
}

/** A file in an answer, with what it takes to fetch and to credit it. */
export interface CommonsFile {
  /** "File:LL-Q1321 (spa)-Julie Samothrace-casa.wav". */
  title: string;
  /** Its place in a search's results, best first. */
  rank: number;
  /** The file itself. */
  url: string;
  /** Its page on Commons. */
  page: string;
  licence: string;
  /** Who made it, as its page says, as plain text. Empty when the page does not say. */
  artist: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** A page's own words are HTML: the text of it, on one line. */
function plain(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|nbsp|#0?39);/g, (_m, name: string) =>
      ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' } as Record<string, string>)[name] ?? "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The files an answer holds, best first. A file with no address, no page or
 * no licence named is left out: it could not be fetched, or could not be
 * credited. Anything that is not an answer holds none.
 */
export function filesIn(answer: unknown): CommonsFile[] {
  const pages = isObject(answer) && isObject(answer.query) ? answer.query.pages : null;
  if (!Array.isArray(pages)) return [];
  const files: CommonsFile[] = [];
  for (const [at, page] of (pages as unknown[]).entries()) {
    if (!isObject(page) || page.missing === true || typeof page.title !== 'string') continue;
    const info: unknown = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
    if (!isObject(info) || typeof info.url !== 'string' || typeof info.descriptionurl !== 'string') continue;
    // Commons adds where the address was got from; the file is what comes before.
    const url = info.url.split('?')[0] ?? '';
    if (!url.startsWith(COMMONS_FILES) || !info.descriptionurl.startsWith(COMMONS_PAGES)) continue;
    const said = isObject(info.extmetadata) ? info.extmetadata : {};
    const value = (key: string): string => {
      const v = said[key];
      return isObject(v) && typeof v.value === 'string' ? plain(v.value) : '';
    };
    const licence = value('LicenseShortName');
    if (!licence) continue;
    files.push({
      title: page.title,
      rank: typeof page.index === 'number' ? page.index : at + 1,
      url,
      page: info.descriptionurl,
      licence: licence.slice(0, 40),
      artist: value('Artist').slice(0, 80),
    });
  }
  return files.sort((a, b) => a.rank - b.rank);
}

const same = (a: string, b: string): boolean => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();

/**
 * Lingua Libre's recording of a word among an answer's files: the best ranked
 * one in this language whose name ends in the word, and the speaker its name
 * gives. The search matches the word anywhere in a title, in any language of
 * the category's neighbours, so each title is read again here.
 */
export function linguaLibreOf(
  files: readonly CommonsFile[], word: string, iso: string,
): { file: CommonsFile; speaker: string } | null {
  for (const file of files) {
    const named = /^File:LL-Q\d+ \(([a-z]{2,3})\)-(.+)\.wav$/i.exec(file.title);
    if (!named || named[1]?.toLowerCase() !== iso) continue;
    const rest = (named[2] ?? '').normalize('NFC');
    const cut = rest.length - word.normalize('NFC').length;
    // "<speaker>-<word>": a speaker of at least a letter, a hyphen, the word.
    if (cut < 2 || rest[cut - 1] !== '-' || !same(rest.slice(cut), word)) continue;
    return { file, speaker: rest.slice(0, cut - 1) };
  }
  return null;
}

/** The file with exactly this name among an answer's files. */
export function namedOf(files: readonly CommonsFile[], title: string): CommonsFile | null {
  // Commons writes a name's spaces as it likes, and nothing else differently.
  const key = (t: string): string => t.normalize('NFC').replace(/_/g, ' ');
  return files.find((f) => key(f.title) === key(title)) ?? null;
}

/**
 * The MP3 Commons makes of a recording: a fifth the size of a WAV, and a type
 * every player and Anki take. Null for an address that is not a Commons file.
 */
export function mp3Of(url: string): string | null {
  if (!url.startsWith(COMMONS_FILES)) return null;
  const path = url.slice(COMMONS_FILES.length);
  if (!/^[0-9a-f]\/[0-9a-f]{2}\/[^/?#]+$/.test(path)) return null;
  return `${COMMONS_FILES}transcoded/${path}/${path.slice(path.lastIndexOf('/') + 1)}.mp3`;
}

/** A Commons file's credit: the speaker its name gives, or else whoever its page says made it. */
export function creditOf(file: CommonsFile, speaker?: string): Credit {
  return { by: (speaker ?? file.artist) || 'Wikimedia Commons', licence: file.licence, page: file.page };
}

/** audio-cmn's file for a word, which it names by the simplified characters. Null for anything else. */
export function audioCmnUrl(word: string): string | null {
  const w = word.normalize('NFC');
  return /^\p{sc=Han}{1,8}$/u.test(w) ? `${AUDIO_CMN}cmn-${encodeURIComponent(w)}.mp3` : null;
}
