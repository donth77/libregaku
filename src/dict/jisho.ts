import type { Entry } from './jmdict';

/**
 * Jisho.org as a stand-in for the local dictionary.
 *
 * Worth being precise about what this is: Jisho is *built on JMdict*, the same
 * database we download. Its API returns the same data from someone else's
 * server, so this is not a second dictionary — it is the same dictionary,
 * remote, rate-limited, and requiring connectivity.
 *
 * That makes it exactly right as a fallback and wrong as a default. It covers
 * the first run, while 11 MB is downloading, and the case where the download
 * fails — so a word is never unlookupable just because indexing has not
 * finished.
 */

const API = 'https://jisho.org/api/v1/search/words';

interface JishoSense {
  english_definitions?: string[];
  parts_of_speech?: string[];
}

interface JishoWord {
  slug?: string;
  is_common?: boolean;
  japanese?: Array<{ word?: string; reading?: string }>;
  senses?: JishoSense[];
}

/** Map Jisho's readable POS names back onto the codes the UI expands. */
const POS_BACK: Record<string, string> = {
  Noun: 'n', 'Ichidan verb': 'v1', 'Godan verb': 'v5r', 'Suru verb': 'vs',
  'Transitive verb': 'vt', 'Intransitive verb': 'vi', 'I-adjective': 'adj-i',
  'Na-adjective': 'adj-na', Adverb: 'adv', Expression: 'exp', Particle: 'prt',
  Pronoun: 'pn', Conjunction: 'conj', Prefix: 'pref', Suffix: 'suf',
  Interjection: 'int', Counter: 'ctr',
};

function backMap(names: string[]): string[] {
  return names.map((n) => {
    const exact = POS_BACK[n];
    if (exact) return exact;
    const partial = Object.keys(POS_BACK).find((k) => n.startsWith(k));
    return partial ? POS_BACK[partial]! : n;
  });
}

export function toEntries(data: JishoWord[], key: string): Entry[] {
  const out: Entry[] = [];

  for (const w of data) {
    const jp = w.japanese?.[0];
    const word = jp?.word ?? jp?.reading;
    if (!word) continue;

    const senses = (w.senses ?? [])
      .map((s) => ({
        pos: backMap(s.parts_of_speech ?? []),
        glosses: s.english_definitions ?? [],
      }))
      .filter((s) => s.glosses.length);
    if (!senses.length) continue;

    out.push({
      id: w.slug ?? word,
      word,
      reading: jp?.word ? jp.reading : undefined,
      common: Boolean(w.is_common),
      senses,
    });
  }

  // Jisho returns fuzzy matches; an exact hit on what we asked for comes first.
  return out.sort((a, b) => {
    const exact = Number(b.word === key) - Number(a.word === key);
    if (exact) return exact;
    return Number(b.common) - Number(a.common);
  });
}

export async function jishoLookup(key: string): Promise<Entry[]> {
  const res = await fetch(`${API}?keyword=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`jisho returned HTTP ${res.status}`);
  const body = (await res.json()) as { data?: JishoWord[] };
  return toEntries(body.data ?? [], key);
}
