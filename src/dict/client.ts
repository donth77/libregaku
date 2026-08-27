import type { Entry } from './jmdict';

/** Content-script side of the dictionary. The store itself lives offscreen. */

export interface DictStatus {
  ready: boolean;
  phase: string;
  percent: number;
  error: string | null;
}

const cache = new Map<string, Entry[]>();

export async function ensureDictionary(): Promise<DictStatus> {
  await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-load' })) as
    | DictStatus
    | undefined;
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
 */
export async function lookupWord(lemma: string | undefined, surface: string): Promise<Entry[]> {
  for (const key of [lemma, surface].filter((k): k is string => Boolean(k))) {
    const hit = cache.get(key);
    if (hit) {
      if (hit.length) return hit;
      continue;
    }
    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'dict-lookup',
      key,
    })) as { ok?: boolean; entries?: Entry[] } | undefined;

    const entries = res?.ok ? (res.entries ?? []) : [];
    if (cache.size > 2000) cache.clear();
    cache.set(key, entries);
    if (entries.length) return entries;
  }
  return [];
}
