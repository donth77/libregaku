import type { Token } from '../morphology/types';
import type { Entry } from './jmdict';

/** Content-script side of the dictionary. The store itself lives offscreen. */

export interface DictStatus {
  ready: boolean;
  phase: string;
  percent: number;
  error: string | null;
}

const cache = new Map<string, Entry[]>();

export type LookupResult =
  | { state: 'ok'; entries: Entry[] }
  | { state: 'empty' }
  | { state: 'loading'; percent: number }
  | { state: 'error'; error: string };

/** What the analyser knows about a key, to rank homographs by. */
export interface LookupHint {
  /** Reading of the key, either kana. */
  reading?: string;
  /** The analyser's part of speech, as the token carries it. */
  pos?: string;
}

interface Key extends LookupHint {
  key: string;
}

/** Said when nothing answers at all — distinct from a dictionary still loading. */
const NO_ANSWER = 'the dictionary did not answer — reload the page to restart it';

export async function ensureDictionary(edition: string): Promise<DictStatus> {
  await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
  const res = (await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'dict-load',
    edition,
  })) as DictStatus | undefined;
  return (
    res ?? {
      ready: false,
      phase: 'unavailable',
      percent: 0,
      error: 'the offscreen document did not answer',
    }
  );
}

export async function dictStatus(): Promise<DictStatus> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-status' })) as
    | DictStatus
    | undefined;
  return res ?? { ready: false, phase: 'unavailable', percent: 0, error: NO_ANSWER };
}

const idOf = (k: Key): string => `${k.key}\u0000${k.reading ?? ''}\u0000${k.pos ?? ''}`;

/**
 * Try each key in turn until one has entries.
 *
 * Only *answers* are cached. Caching a failure was the original bug here: a
 * click while the dictionary was still indexing stored an empty result, and
 * every later lookup of that word returned it — so the card said "no entry"
 * forever, even once the data had landed.
 */
async function lookupKeys(keys: Key[]): Promise<LookupResult> {
  for (const k of keys) {
    const hit = cache.get(idOf(k));
    if (hit?.length) return { state: 'ok', entries: hit };
  }

  for (const k of keys) {
    const id = idOf(k);
    if (cache.has(id)) continue;   // known-empty, but a later key may still hit

    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'dict-lookup',
      key: k.key,
      reading: k.reading,
      pos: k.pos,
    })) as { ok?: boolean; entries?: Entry[]; error?: string; source?: string } | undefined;

    // No reply is not "still loading": with nothing listening, the status
    // check below gets no reply either, and the card said 0% forever.
    if (!res) return { state: 'error', error: NO_ANSWER };

    if (!res.ok) {
      // Not an answer — do not remember it.
      const status = await dictStatus();
      if (status.error) return { state: 'error', error: res.error ? `${status.error}; ${res.error}` : status.error };
      if (!status.ready) return { state: 'loading', percent: status.percent };
      return { state: 'error', error: res.error ?? 'lookup failed' };
    }

    const entries = res.entries ?? [];
    // Only remember answers from the local copy; the offscreen document keeps
    // remote ones, and a local answer should replace them once it can.
    if (res.source === 'local') {
      if (cache.size > 2000) cache.clear();
      cache.set(id, entries);
    }
    if (entries.length) return { state: 'ok', entries };
  }

  return { state: 'empty' };
}

/**
 * Look a word up, trying the dictionary form first.
 *
 * The lemma is what JMdict is keyed on, so 来た resolves through 来る. Falling
 * back to the surface covers words the analyser could not resolve. `hint`
 * describes the lemma.
 */
export function lookupWord(lemma: string | undefined, surface: string, hint?: LookupHint): Promise<LookupResult> {
  const keys: Key[] = [];
  if (lemma) keys.push({ key: lemma, ...hint });
  if (surface && surface !== lemma) keys.push({ key: surface });
  return lookupKeys(keys);
}

/**
 * Look a token up the way the analyser planned.
 *
 * A tier-2 token carries its keys in order — 勉強している tries 勉強する,
 * then 勉強; 3匹 falls back to 匹 — each with the reading and part of speech
 * that pick 私【わたし】 over 私【あたし】 and この over 九. Anything else is
 * looked up by lemma, then surface.
 */
export function lookupToken(token: Pick<Token, 'surface' | 'lemma' | 'lemmaReading' | 'pos' | 'lookup'>): Promise<LookupResult> {
  if (token.lookup?.length) return lookupKeys(token.lookup.filter((k) => k.key));
  return lookupWord(token.lemma, token.surface, { reading: token.lemmaReading });
}

/** Forget negative results so a finished download takes effect immediately. */
export function clearLookupCache(): void {
  cache.clear();
}
