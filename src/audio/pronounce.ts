/**
 * Word pronunciation.
 *
 * A synthesised voice is a poor model for a learner: it flattens pitch accent,
 * which in Japanese is lexical, and mispronounces names and rare readings. So
 * real recordings come first and synthesis is only the floor.
 *
 * The chain, best to worst:
 *   1. JapanesePod101 — human recordings, free, no key, wide coverage
 *   2. A user-supplied URL template — for anyone with their own source
 *   3. speechSynthesis — always available, never fails, never great
 *
 * Forvo was the obvious second source and is not usable: its API is paid, and
 * a libre extension should not ship a dependency most users cannot exercise.
 * Wikimedia Commons was the next candidate and is too thin to matter — 538
 * Japanese files in total, keyed by romaji, with nothing for 食べる or 勉強.
 * So the template exists instead: anyone with a Forvo key, a local collection
 * or another service can point at it without the project taking on either the
 * cost or the licence.
 */

import { toHiragana } from '../morphology/furigana';

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
 * the one the user's own template names.
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
  const own = templateHost(template);
  return own !== null && u.host === own;
}

export type Source = 'jpod101' | 'custom' | 'synthesis';

export interface Spoken {
  source: Source;
  /** False when we fell through to synthesis. */
  human: boolean;
}

/** A recording, as bytes: to play now, or to put on a card. */
export interface Recording {
  /** Base64 — how messages carry bytes, and how AnkiConnect takes media. */
  data: string;
  /** Decoded size, in bytes. */
  size: number;
  type: string;
  source: 'jpod101' | 'custom';
}

let current: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function stop(): void {
  current?.pause();
  current = null;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

async function play(rec: Recording): Promise<void> {
  stop();
  const bin = atob(rec.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  currentUrl = URL.createObjectURL(new Blob([bytes], { type: rec.type }));
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
async function fetchBytes(url: string): Promise<{ ok: true; data: string; size: number; type: string } | { ok: false; reason: string }> {
  const r = (await chrome.runtime.sendMessage({ type: 'fetch-audio', url })) as
    | { ok: boolean; status?: number; type?: string; bytes?: string; error?: string }
    | undefined;
  if (!r) return { ok: false, reason: 'no reply from the service worker' };
  if (!r.ok || !r.bytes) return { ok: false, reason: r.error ?? `HTTP ${r.status}` };
  return { ok: true, data: r.bytes, size: decodedSize(r.bytes), type: r.type ?? 'audio/mpeg' };
}

/** Fetched as bytes so the body can be inspected before anything is played. */
async function tryJpod(word: string, reading?: string): Promise<Recording | null> {
  const q = jpodQuery(word, reading);
  const say = (verdict: string): void =>
    console.log(`%c[libregaku]%c audio ${verdict} · ${q}`, 'color:#8AA2E8', '');

  try {
    const got = await fetchBytes(`${JPOD}?${q}`);
    if (!got.ok) {
      say(got.reason);
      return null;
    }
    if (got.size === JPOD_MISSING_BYTES) {
      say('not in jpod101');
      return null;
    }
    if (got.size < 512) {
      say(`suspiciously small (${got.size}b)`);
      return null;
    }
    say(`recording ${got.size}b`);
    return { data: got.data, size: got.size, type: got.type, source: 'jpod101' };
  } catch (e) {
    // A blocked host reports identically to a dead network here, and the
    // fallback hides it — so name it rather than failing quietly.
    say(`fetch failed (${String(e)})`);
    return null;
  }
}

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
 * Where human recordings of a language's words can be had, by language.
 * JapanesePod101 has Japanese only; a language with no source here goes
 * straight to the learner's own, if they set one.
 */
const RECORDED: Record<string, (word: string, reading?: string) => Promise<Recording | null>> = {
  ja: tryJpod,
};

async function lookFor(word: string, reading: string | undefined, lang: string): Promise<Recording | null> {
  const recorded = await RECORDED[lang]?.(word, reading);
  if (recorded) return recorded;
  const template = await storedTemplate();
  return template ? tryTemplate(template, word, reading) : null;
}

/** Recordings found this session, so pronouncing a word and then carding it fetches it once. */
const found = new Map<string, Recording>();
const KEEP = 40;

/**
 * A human recording of the word, or null when no source has one.
 *
 * Never synthesis. A synthesised voice can be played but not stored on a
 * card, and should not be: it is the poorest model there is to imitate.
 * JapanesePod101 has Japanese only, so other languages go straight to the
 * learner's own source, if they set one.
 */
export async function findRecording(word: string, reading?: string, lang = 'ja'): Promise<Recording | null> {
  const key = `${lang}|${word}|${reading ?? ''}`;
  const known = found.get(key);
  if (known) return known;
  // Misses are not kept: a network that failed once may not fail again.
  const rec = await lookFor(word, reading, lang);
  if (rec) {
    found.set(key, rec);
    if (found.size > KEEP) found.delete(found.keys().next().value as string);
  }
  return rec;
}

/**
 * The voice a language is spoken in when nothing says which country's: the
 * one most courses teach. Any other language is asked for by its own code.
 */
const VOICES: Record<string, string> = {
  ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR', th: 'th-TH',
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
  const voice = voices.find((v) => v.lang.replace('_', '-') === locale) ?? voices.find((v) => v.lang.startsWith(lang));
  if (voice) u.voice = voice;
  stop();
  speechSynthesis.speak(u);
}

/**
 * Say a word: a recording where one exists, the browser's voice for the
 * language otherwise. `lang` is the language being learned — a Spanish word
 * read by a Japanese voice is no model at all.
 */
export async function pronounce(word: string, reading?: string, lang = 'ja'): Promise<Spoken> {
  const rec = await findRecording(word, reading, lang);
  if (rec) {
    await play(rec);
    return { source: rec.source, human: true };
  }
  synthesise(word, lang);
  return { source: 'synthesis', human: false };
}
