import type { Entry } from './jmdict';

/**
 * The remote fallback, for while the local dictionary is not ready.
 *
 * Jotoba first — its API is documented and permitted — and Jisho only if
 * Jotoba had nothing or failed, and only ever once per lookup. Jisho serves
 * English alone, so for any other edition it is not asked at all: English
 * definitions under a German setting would be the setting silently not
 * working.
 *
 * Answers are remembered for the session, empty ones included — Jotoba
 * saying "no such word" is an answer. Failures are not: a timeout or a rate
 * limit says nothing about the word, and the next hover should try again.
 */

export type RemoteAnswer =
  | { ok: true; entries: Entry[]; source: 'remote' }
  | { ok: false; error: string };

export interface RemoteSources {
  jotoba: (key: string, edition: string) => Promise<Entry[]>;
  jisho: (key: string) => Promise<Entry[]>;
}

export function remoteLookup(
  sources: RemoteSources,
  limit = 2000,
): (key: string, edition: string) => Promise<RemoteAnswer> {
  const cache = new Map<string, Entry[]>();

  return async (key, edition) => {
    const id = `${edition}\u0000${key}`;
    const hit = cache.get(id);
    if (hit) return { ok: true, entries: hit, source: 'remote' };

    let entries: Entry[] | null = null;
    const failures: string[] = [];
    try {
      entries = await sources.jotoba(key, edition);
    } catch (e) {
      failures.push(`Jotoba: ${String(e)}`);
    }
    if (!entries?.length && edition === 'eng') {
      try {
        entries = await sources.jisho(key);
      } catch (e) {
        failures.push(`Jisho: ${String(e)}`);
      }
    }

    if (entries === null) return { ok: false, error: failures.join('; ') };
    if (cache.size >= limit) cache.clear();
    cache.set(id, entries);
    return { ok: true, entries, source: 'remote' };
  };
}
