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

export async function ensureDictionary(edition: string): Promise<DictStatus> {
  await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
  const res = (await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'dict-load',
    edition,
  })) as DictStatus | undefined;
  return res ?? { ready: false, phase: 'unavailable', percent: 0, error: null };
}

export async function dictStatus(): Promise<DictStatus> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-status' })) as
    | DictStatus
    | undefined;
  return res ?? { ready: false, phase: 'unavailable', percent: 0, error: null };
}

/**
 * Look a word up, trying the dictionary form first.
 *
 * The lemma is what JMdict is keyed on, so 来た resolves through 来る. Falling
 * back to the surface covers words the analyser could not resolve.
 *
 * Only *answers* are cached. Caching a failure was the original bug here: a
 * click while the dictionary was still indexing stored an empty result, and
 * every later lookup of that word returned it — so the card said "no entry"
 * forever, even once the data had landed.
 */
export async function lookupWord(lemma: string | undefined, surface: string): Promise<LookupResult> {
  const keys = [lemma, surface].filter((k): k is string => Boolean(k));

  for (const key of keys) {
    const hit = cache.get(key);
    if (hit?.length) return { state: 'ok', entries: hit };
  }

  for (const key of keys) {
    if (cache.has(key)) continue;   // known-empty, but a later key may still hit

    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'dict-lookup',
      key,
    })) as { ok?: boolean; entries?: Entry[]; error?: string; source?: string } | undefined;

    if (!res?.ok) {
      // Not an answer — do not remember it.
      const status = await dictStatus();
      if (status.error) return { state: 'error', error: status.error };
      if (!status.ready) return { state: 'loading', percent: status.percent };
      return { state: 'error', error: res?.error ?? 'lookup failed' };
    }

    const entries = res.entries ?? [];
    // Only remember answers from the local copy. A remote miss may simply mean
    // Jisho was rate-limited, and caching that would repeat the original bug.
    if (res.source === 'local') {
      if (cache.size > 2000) cache.clear();
      cache.set(key, entries);
    }
    if (entries.length) return { state: 'ok', entries };
  }

  return { state: 'empty' };
}

/** Forget negative results so a finished download takes effect immediately. */
export function clearLookupCache(): void {
  cache.clear();
}
