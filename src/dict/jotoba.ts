import type { Entry } from './jmdict';

/**
 * Jotoba as the remote fallback.
 *
 * Preferred over Jisho for one reason that matters: Jotoba **documents and
 * permits** API use. Jisho's endpoint is unofficial — it works, everyone uses
 * it, and nobody promised anything. For a project that cares about licences
 * and provenance elsewhere, leaning on a sanctioned API is the consistent
 * choice.
 *
 * Both serve JMdict underneath, so this is the same data either way.
 */

const API = 'https://jotoba.de/api/search/words';

interface JotobaWord {
  reading?: { kanji?: string; kana?: string };
  common?: boolean;
  senses?: Array<{ glosses?: string[]; pos?: unknown[] }>;
}

/** Jotoba reports parts of speech as objects or strings; flatten to a label. */
function posLabel(pos: unknown[]): string[] {
  const out: string[] = [];
  for (const p of pos) {
    if (typeof p === 'string') out.push(p);
    else if (p && typeof p === 'object') {
      const key = Object.keys(p as Record<string, unknown>)[0];
      if (key) out.push(key);
    }
  }
  return out;
}

export function toEntries(words: JotobaWord[], key: string): Entry[] {
  const out: Entry[] = [];

  for (const w of words) {
    const kanji = w.reading?.kanji;
    const kana = w.reading?.kana;
    const word = kanji ?? kana;
    if (!word) continue;

    const senses = (w.senses ?? [])
      .map((s) => ({ pos: posLabel(s.pos ?? []), glosses: s.glosses ?? [] }))
      .filter((s) => s.glosses.length);
    if (!senses.length) continue;

    out.push({
      id: word,
      word,
      reading: kanji ? kana : undefined,
      common: Boolean(w.common),
      senses,
    });
  }

  return out.sort((a, b) => {
    const exact = Number(b.word === key) - Number(a.word === key);
    if (exact) return exact;
    return Number(b.common) - Number(a.common);
  });
}

export async function jotobaLookup(key: string): Promise<Entry[]> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: key, language: 'English', no_english: false }),
  });
  if (!res.ok) throw new Error(`jotoba returned HTTP ${res.status}`);
  const body = (await res.json()) as { words?: JotobaWord[] };
  return toEntries(body.words ?? [], key);
}
