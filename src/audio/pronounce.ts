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

export type Source = 'jpod101' | 'custom' | 'synthesis';

export interface Spoken {
  source: Source;
  /** False when we fell through to synthesis. */
  human: boolean;
}

let current: HTMLAudioElement | null = null;

function stop(): void {
  current?.pause();
  current = null;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

async function playUrl(url: string): Promise<void> {
  stop();
  const audio = new Audio(url);
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

/**
 * Recordings are fetched by the service worker, not from here. A content
 * script's fetch is bound by the host page's CORS policy, and neither jpod101
 * nor the CDN it redirects to allows cross-origin reads — so from a content
 * script every recording failed as "Failed to fetch", and synthesis quietly
 * took its place. Host permissions apply in the worker; CORS does not.
 */
async function fetchBlob(url: string): Promise<{ ok: true; blob: Blob } | { ok: false; reason: string }> {
  const r = (await chrome.runtime.sendMessage({ type: 'fetch-audio', url })) as
    | { ok: boolean; status?: number; type?: string; bytes?: string; error?: string }
    | undefined;
  if (!r) return { ok: false, reason: 'no reply from the service worker' };
  if (!r.ok || !r.bytes) return { ok: false, reason: r.error ?? `HTTP ${r.status}` };
  const bin = atob(r.bytes);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { ok: true, blob: new Blob([bytes], { type: r.type ?? 'audio/mpeg' }) };
}

/** Fetch as a blob so the body can be inspected before anything is played. */
async function tryJpod(word: string, reading?: string): Promise<string | null> {
  const q = jpodQuery(word, reading);
  const say = (verdict: string): void =>
    console.log(`%c[libregaku]%c audio ${verdict} · ${q}`, 'color:#8AA2E8', '');

  try {
    const got = await fetchBlob(`${JPOD}?${q}`);
    if (!got.ok) {
      say(got.reason);
      return null;
    }
    const blob = got.blob;
    if (blob.size === JPOD_MISSING_BYTES) {
      say('not in jpod101');
      return null;
    }
    if (blob.size < 512) {
      say(`suspiciously small (${blob.size}b)`);
      return null;
    }
    say(`recording ${blob.size}b`);
    return URL.createObjectURL(blob);
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
async function tryTemplate(template: string, word: string, reading?: string): Promise<string | null> {
  try {
    const url = template
      .replaceAll('{word}', encodeURIComponent(word))
      .replaceAll('{reading}', encodeURIComponent(reading ?? word));
    const got = await fetchBlob(url);
    if (!got.ok) return null;
    const blob = got.blob;
    if (blob.size < 512) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function synthesise(word: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'ja-JP';
  u.rate = 0.85;
  // Prefer a real Japanese voice over whatever the browser defaults to.
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'));
  if (voice) u.voice = voice;
  stop();
  speechSynthesis.speak(u);
}

export async function pronounce(word: string, reading?: string): Promise<Spoken> {
  const jpod = await tryJpod(word, reading);
  if (jpod) {
    await playUrl(jpod);
    return { source: 'jpod101', human: true };
  }

  try {
    const got = await chrome.storage.sync.get('libregaku.audioTemplate');
    const template = got['libregaku.audioTemplate'];
    if (typeof template === 'string' && template.includes('{word}')) {
      const custom = await tryTemplate(template, word, reading);
      if (custom) {
        await playUrl(custom);
        return { source: 'custom', human: true };
      }
    }
  } catch {
    /* storage unavailable; synthesis still covers us */
  }

  synthesise(word);
  return { source: 'synthesis', human: false };
}
