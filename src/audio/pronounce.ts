/**
 * Word pronunciation.
 *
 * A synthesised voice is a poor model for a learner: it flattens pitch accent,
 * which in Japanese is lexical, and mispronounces names and rare readings. So
 * real recordings come first and synthesis is only the floor.
 *
 * The chain, best to worst:
 *   1. A recording of a person, from the language's own sources (RECORDED):
 *      JapanesePod101 for Japanese; free recordings on Wikimedia Commons for
 *      Spanish, Chinese and Korean, and for Chinese the HSK words of audio-cmn
 *      before those (recordings.ts). For Korean, Naver Dictionary's own
 *      recordings after those, to be heard on the lookup card and never
 *      put on a card
 *   2. A user-supplied URL template — for anyone with their own source
 *   3. speechSynthesis — always available, never fails, never great
 *
 * Forvo was the obvious second source and is not usable: its API is paid, and
 * a libre extension should not ship a dependency most users cannot exercise.
 * Wikimedia Commons is too thin for Japanese to matter — 538 files in total,
 * keyed by romaji, with nothing for 食べる or 勉強 — and is most of what there
 * is for Spanish. So the template exists as well: anyone with a Forvo key, a
 * local collection or another service can point at it without the project
 * taking on either the cost or the licence.
 */

import { toHiragana } from '../morphology/furigana';
import {
  AUDIO_CMN, AUDIO_CMN_CREDIT, COMMONS_API, COMMONS_FILES, LINGUA_LIBRE, NAMED, NAVER_API, NAVER_SOUNDS,
  askable, audioCmnUrl, creditOf, filesIn, linguaLibreOf, linguaLibreSearch, mp3Of, namedOf, namedQuery, namedTitle,
  SPANISHDICT_API, naverSearch, naverSoundIn, spanishDictVoice,
  type CommonsFile, type Credit,
} from './recordings';

export type { Credit } from './recordings';

const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';

/**
 * JapanesePod101 answers 200 for every request. A word it does not have gets a
 * fixed "not found" recording, which is why this is a size check rather than a
 * status check.
 */
const JPOD_MISSING_BYTES = 52288;

/** Where a user's own audio source is stored: a URL with {word} and optionally {reading}. */
export const TEMPLATE_KEY = 'libregaku.audioTemplate';

/**
 * The hosts recordings come from, and so the only ones the service worker
 * will fetch for this module: jpod101, and the CDN it redirects to. A fetch
 * relay that took any URL would be a way to make requests as the extension.
 */
export const AUDIO_HOSTS: readonly string[] = ['assets.languagepod101.com', 'cdn.innovativelanguage.com'];

/**
 * Sources that are one corner of a host with much else on it: Wikimedia
 * Commons' query API and its files, one repository's folder on GitHub at
 * one commit, Naver Dictionary's word search and its recordings, and SpanishDict's
 * voice. Each is
 * allowed by how its address starts, not by its host.
 */
export const AUDIO_PLACES: readonly string[] = [COMMONS_API, COMMONS_FILES, AUDIO_CMN, NAVER_API, NAVER_SOUNDS, SPANISHDICT_API];

/** No recording of one word comes near this; anything bigger is not one. */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/** The host a user's template points at — host and port — or null when it is not usable. */
export function templateHost(template: unknown): string | null {
  if (typeof template !== 'string' || !template.includes('{word}')) return null;
  try {
    const url = new URL(template.replaceAll('{word}', 'w').replaceAll('{reading}', 'r'));
    return url.protocol === 'https:' ? url.host : null;
  } catch {
    return null;
  }
}

/**
 * Whether the service worker may fetch this URL as audio: https, no
 * credentials in it, and a host this module actually uses — jpod101's, or
 * the one the user's own template names — or one of the places above. The
 * address is read as the browser would write it, so "/../" gets nowhere.
 */
export function audioUrlAllowed(url: string, template?: unknown): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  if (AUDIO_HOSTS.includes(u.host)) return true;
  if (AUDIO_PLACES.some((place) => u.href.startsWith(place))) return true;
  const own = templateHost(template);
  return own !== null && u.host === own;
}

export type Source = 'jpod101' | 'commons' | 'audio-cmn' | 'naver' | 'spanishdict' | 'custom' | 'synthesis';

export interface Spoken {
  source: Source;
  /** False when we fell through to synthesis. */
  human: boolean;
  /** Who recorded it and under what licence, where the source says. */
  credit?: Credit;
}

/** A recording, as bytes: to play now, or to put on a card. */
export interface Recording {
  /** Base64 — how messages carry bytes, and how AnkiConnect takes media. */
  data: string;
  /** Decoded size, in bytes. */
  size: number;
  type: string;
  source: 'jpod101' | 'commons' | 'audio-cmn' | 'naver' | 'spanishdict' | 'custom';
  /** Who recorded it and under what licence, where the source says: shown where it plays, kept on the card. */
  credit?: Credit;
}

/** What asking one source came to: a recording, none there, or no answer to go by. */
type Asked = Recording | 'none' | 'unsure';

/**
 * One source of recordings. `also` is how else the word is written — a
 * Chinese word's other script — for a source that files it under that.
 */
type Finder = (word: string, reading: string | undefined, also: readonly string[]) => Promise<Asked>;

let current: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function stop(): void {
  current?.pause();
  current = null;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function bytesOf(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function play(rec: Recording): Promise<void> {
  stop();
  currentUrl = URL.createObjectURL(new Blob([bytesOf(rec.data)], { type: rec.type }));
  const audio = new Audio(currentUrl);
  current = audio;
  await audio.play();
}

/**
 * Build the query the service actually answers to.
 *
 * Two things it is strict about, both of which silently returned the
 * "not found" recording before:
 *
 *  - The reading must be hiragana. Lindera hands back katakana (タベル), and
 *    kana=タベル misses for every kanji word — which would have meant no
 *    recording ever played for the vocabulary that most needs one.
 *  - `kana` is required even when the word is already kana. Sending kanji=やばい
 *    alone misses; kanji=やばい&kana=やばい returns audio.
 */
export function jpodQuery(word: string, reading?: string): string {
  return new URLSearchParams({
    kanji: word,
    kana: toHiragana(reading ?? word),
  }).toString();
}

/** The size of what a base64 string decodes to, without decoding it. */
export function decodedSize(b64: string): number {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

/**
 * Recordings are fetched by the service worker, not from here. A content
 * script's fetch is bound by the host page's CORS policy, and neither jpod101
 * nor the CDN it redirects to allows cross-origin reads — so from a content
 * script every recording failed as "Failed to fetch", and synthesis quietly
 * took its place. Host permissions apply in the worker; CORS does not.
 */
async function fetchBytes(
  url: string,
): Promise<{ ok: true; data: string; size: number; type: string } | { ok: false; reason: string; status?: number }> {
  const r = (await chrome.runtime.sendMessage({ type: 'fetch-audio', url })) as
    | { ok: boolean; status?: number; type?: string; bytes?: string; error?: string }
    | undefined;
  if (!r) return { ok: false, reason: 'no reply from the service worker' };
  if (!r.ok || !r.bytes) {
    return { ok: false, reason: r.error ?? `HTTP ${r.status}`, ...(r.status === undefined ? {} : { status: r.status }) };
  }
  return { ok: true, data: r.bytes, size: decodedSize(r.bytes), type: r.type ?? 'audio/mpeg' };
}

/** What came of asking a source, in the console: a fallback to the voice hides every failure otherwise. */
const report = (verdict: string, what: string): void =>
  console.log(`%c[libregaku]%c audio ${verdict} · ${what}`, 'color:#8AA2E8', '');

/** Fetched as bytes so the body can be inspected before anything is played. */
const tryJpod: Finder = async (word, reading) => {
  const q = jpodQuery(word, reading);
  const say = (verdict: string): void => report(verdict, q);

  try {
    const got = await fetchBytes(`${JPOD}?${q}`);
    if (!got.ok) {
      say(got.reason);
      return 'unsure';
    }
    if (got.size === JPOD_MISSING_BYTES) {
      say('not in jpod101');
      return 'none';
    }
    if (got.size < 512) {
      say(`suspiciously small (${got.size}b)`);
      return 'unsure';
    }
    say(`recording ${got.size}b`);
    return { data: got.data, size: got.size, type: got.type, source: 'jpod101' };
  } catch (e) {
    // A blocked host reports identically to a dead network here, and the
    // fallback hides it — so name it rather than failing quietly.
    say(`fetch failed (${String(e)})`);
    return 'unsure';
  }
};

/** The word, then how else it is written: each once, in that order. */
const written = (word: string, also: readonly string[]): string[] => [...new Set([word, ...also])];

/** What Commons says to a question, or null when it would not answer. */
async function askCommons(url: string): Promise<unknown> {
  try {
    const got = await fetchBytes(url);
    return got.ok ? (JSON.parse(new TextDecoder().decode(bytesOf(got.data))) as unknown) : null;
  } catch {
    return null;
  }
}

/** A Commons file as a recording: the MP3 Commons makes of it, or the file itself where that is missing. */
async function fromCommons(file: CommonsFile, speaker?: string): Promise<Asked> {
  const mp3 = mp3Of(file.url);
  for (const url of mp3 ? [mp3, file.url] : [file.url]) {
    try {
      const got = await fetchBytes(url);
      if (got.ok && got.size >= 512) {
        report(`recording ${got.size}b`, file.title);
        return { data: got.data, size: got.size, type: got.type, source: 'commons', credit: creditOf(file, speaker) };
      }
    } catch {
      /* the next address */
    }
  }
  report('could not fetch', file.title);
  return 'unsure';
}

/** Lingua Libre's recordings on Commons, in the language it calls `iso`. */
function linguaLibre(iso: string): Finder {
  return async (word, _reading, also) => {
    let unsure = false;
    for (const form of written(word, also).filter(askable)) {
      const answer = await askCommons(linguaLibreSearch(form, iso));
      if (answer === null) {
        unsure = true;
        continue;
      }
      const hit = linguaLibreOf(filesIn(answer), form, iso);
      if (hit) return fromCommons(hit.file, hit.speaker);
    }
    if (!unsure) report('not in Lingua Libre', `${word} (${iso})`);
    return unsure ? 'unsure' : 'none';
  };
}

/** Wiktionary's own recordings on Commons, named `<prefix>-<word>.ogg`. */
function named(prefix: string): Finder {
  return async (word) => {
    if (!askable(word)) return 'none';
    const title = namedTitle(prefix, word);
    const answer = await askCommons(namedQuery(title));
    if (answer === null) return 'unsure';
    const file = namedOf(filesIn(answer), title);
    return file ? fromCommons(file) : 'none';
  };
}

/** audio-cmn's HSK words, which it files under the simplified characters. */
const tryAudioCmn: Finder = async (word, _reading, also) => {
  let unsure = false;
  for (const form of written(word, also)) {
    const url = audioCmnUrl(form);
    if (!url) continue;
    try {
      const got = await fetchBytes(url);
      if (got.ok && got.size >= 512) {
        report(`recording ${got.size}b`, `audio-cmn ${form}`);
        return { data: got.data, size: got.size, type: got.type, source: 'audio-cmn', credit: AUDIO_CMN_CREDIT };
      }
      // No such file is its answer for a word it lacks; anything else is no answer.
      if (got.ok || got.status !== 404) unsure = true;
    } catch {
      unsure = true;
    }
  }
  return unsure ? 'unsure' : 'none';
};

/**
 * Naver Dictionary's recording of a Korean word. Only to be heard: its terms
 * do not offer it for reuse, so a card never takes it (see ONLY_TO_HEAR).
 */
const tryNaver: Finder = async (word) => {
  if (!askable(word)) return 'none';
  try {
    const search = await fetchBytes(naverSearch(word));
    if (!search.ok) {
      report(search.reason, `Naver ${word}`);
      return 'unsure';
    }
    // An answer that is not JSON is Naver declining to answer, not a word it lacks.
    let answer: unknown;
    try {
      answer = JSON.parse(new TextDecoder().decode(bytesOf(search.data))) as unknown;
    } catch {
      report('no answer', `Naver ${word}`);
      return 'unsure';
    }
    const hit = naverSoundIn(answer, word);
    if (!hit) {
      report('not in Naver', word);
      return 'none';
    }
    const got = await fetchBytes(hit.url);
    if (!got.ok || got.size < 512) {
      report('could not fetch', `Naver ${word}`);
      return 'unsure';
    }
    report(`recording ${got.size}b`, `Naver ${word}`);
    return { data: got.data, size: got.size, type: got.type, source: 'naver', credit: hit.credit };
  } catch (e) {
    report(`fetch failed (${String(e)})`, `Naver ${word}`);
    return 'unsure';
  }
};

/**
 * A user-supplied audio URL, e.g.
 *   https://example.org/audio/{word}.mp3
 *   https://example.org/api?w={word}&r={reading}
 */
async function tryTemplate(template: string, word: string, reading?: string): Promise<Recording | null> {
  try {
    const url = template
      .replaceAll('{word}', encodeURIComponent(word))
      .replaceAll('{reading}', encodeURIComponent(reading ?? word));
    const got = await fetchBytes(url);
    if (!got.ok || got.size < 512) return null;
    return { data: got.data, size: got.size, type: got.type, source: 'custom' };
  } catch {
    return null;
  }
}

async function storedTemplate(): Promise<string | null> {
  try {
    const template = (await chrome.storage.sync.get(TEMPLATE_KEY))[TEMPLATE_KEY];
    return typeof template === 'string' && template.includes('{word}') ? template : null;
  } catch {
    return null;   // storage unavailable; the caller falls back
  }
}

/**
 * Where human recordings of a language's words can be had, by language, best
 * first. JapanesePod101 has Japanese only. Chinese goes to one speaker's HSK
 * words before the volunteers', for the same voice from word to word; Korean
 * to Wiktionary's own files, which have more of its common words, before
 * Lingua Libre's. A language with no source here goes straight to the
 * learner's own, if they set one.
 */
const RECORDED: Record<string, readonly Finder[]> = {
  ja: [tryJpod],
  es: [linguaLibre(LINGUA_LIBRE.es ?? 'spa')],
  zh: [tryAudioCmn, linguaLibre(LINGUA_LIBRE.zh ?? 'cmn')],
  yue: [linguaLibre(LINGUA_LIBRE.yue ?? 'yue')],
  ko: [named(NAMED.ko ?? 'Ko'), linguaLibre(LINGUA_LIBRE.ko ?? 'kor'), tryNaver],
};

/**
 * Sources whose recordings are played and never kept: their terms do not
 * offer them for reuse. A card is made without asking them.
 */
const ONLY_TO_HEAR: ReadonlySet<Finder> = new Set([tryNaver]);

/**
 * A recording from the language's sources, then from the learner's own.
 * `sure` says every source answered and none had it, which is worth
 * remembering; a source that did not answer may have it the next time.
 */
async function lookFor(
  word: string, reading: string | undefined, lang: string, also: readonly string[], forCard: boolean,
): Promise<{ rec: Recording | null; sure: boolean }> {
  let sure = true;
  for (const find of RECORDED[lang] ?? []) {
    if (forCard && ONLY_TO_HEAR.has(find)) continue;
    const got = await find(word, reading, also).catch((): Asked => 'unsure');
    if (got === 'unsure') sure = false;
    else if (got !== 'none') return { rec: got, sure: true };
  }
  const template = await storedTemplate();
  if (!template) return { rec: null, sure };
  // The learner's own source says nothing of why it has none.
  return { rec: await tryTemplate(template, word, reading), sure: false };
}

/** A recording a card may carry: not one that is only to be heard. */
const keepable = (rec: Recording | undefined): Recording | undefined => (rec?.source === 'naver' ? undefined : rec);

/** Recordings found this session, so pronouncing a word and then carding it fetches it once. */
const found = new Map<string, Recording>();
/** Words every source answered for and none had: asked once a session, not at every press. */
const absent = new Set<string>();
const KEEP = 40;
const KEEP_ABSENT = 400;

/**
 * A human recording of the word, or null when no source has one.
 *
 * Never synthesis. A synthesised voice can be played but not stored on a
 * card, and should not be: it is the poorest model there is to imitate.
 * `also` is how else the word is written: a Chinese word's other script.
 * `forCard` is for a recording that will be kept on a card, so one from a
 * source that is only to be heard is not looked for.
 */
export async function findRecording(
  word: string, reading?: string, lang = 'ja', also: readonly string[] = [], forCard = false,
): Promise<Recording | null> {
  const heard = `${lang}|${word}|${reading ?? ''}`;
  const key = forCard ? `card|${heard}` : heard;
  const known = found.get(key) ?? (forCard ? keepable(found.get(heard)) : undefined);
  if (known) return known;
  // Known to be nowhere, unless the learner has named a source of their own since.
  if (absent.has(key) && !(await storedTemplate())) return null;
  const { rec, sure } = await lookFor(word, reading, lang, also, forCard);
  if (rec) {
    found.set(key, rec);
    if (found.size > KEEP) found.delete(found.keys().next().value as string);
  } else if (sure) {
    // Only an answer of "none" is kept: a network that failed once may not fail again.
    absent.add(key);
    if (absent.size > KEEP_ABSENT) absent.delete(absent.values().next().value as string);
  }
  return rec;
}

/**
 * The voice a language is spoken in when nothing says which country's: the
 * one most courses teach. Any other language is asked for by its own code.
 */
const VOICES: Record<string, string> = {
  ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', yue: 'zh-HK', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR', th: 'th-TH',
};

function synthesise(word: string, lang: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  const locale = VOICES[lang] ?? lang;
  u.lang = locale;
  u.rate = 0.85;
  // Prefer a real voice for the language over whatever the browser defaults
  // to: that country's first, then any of the language's.
  const voices = speechSynthesis.getVoices();
  const tagOf = (v: SpeechSynthesisVoice): string => v.lang.replace('_', '-');
  // Cantonese voices are filed as zh-HK, or yue-HK; Mandarin's would read the characters wrongly.
  const voice = lang === 'yue'
    ? voices.find((v) => /^(zh-HK|yue)\b/i.test(tagOf(v)))
    : voices.find((v) => tagOf(v) === locale) ?? voices.find((v) => v.lang.startsWith(lang));
  if (voice) u.voice = voice;
  stop();
  speechSynthesis.speak(u);
}

/**
 * SpanishDict's voice for a Spanish word, or null when it would not say it.
 * Never kept: it is generated, and not offered for reuse (see SPANISHDICT_API).
 */
async function spanishDictVoiceOf(word: string): Promise<Recording | null> {
  if (!askable(word)) return null;
  try {
    const got = await fetchBytes(spanishDictVoice(word));
    if (!got.ok || got.size < 512) {
      report(got.ok ? `suspiciously small (${got.size}b)` : got.reason, `SpanishDict ${word}`);
      return null;
    }
    report(`voice ${got.size}b`, `SpanishDict ${word}`);
    return { data: got.data, size: got.size, type: got.type, source: 'spanishdict' };
  } catch (e) {
    report(`fetch failed (${String(e)})`, `SpanishDict ${word}`);
    return null;
  }
}

/**
 * Say a word: a recording where one exists, then SpanishDict's voice for
 * Spanish, the browser's voice for the language otherwise. `lang` is the language being learned — a Spanish word
 * read by a Japanese voice is no model at all. `also` as for findRecording.
 */
export async function pronounce(
  word: string, reading?: string, lang = 'ja', also: readonly string[] = [],
): Promise<Spoken> {
  const rec = await findRecording(word, reading, lang, also);
  if (rec) {
    await play(rec);
    return { source: rec.source, human: true, ...(rec.credit ? { credit: rec.credit } : {}) };
  }
  const voice = lang === 'es' ? await spanishDictVoiceOf(word) : null;
  if (voice) {
    await play(voice);
    return { source: 'spanishdict', human: false };
  }
  synthesise(word, lang);
  return { source: 'synthesis', human: false };
}
