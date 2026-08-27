/**
 * JMdict, as published by jmdict-simplified.
 *
 * Entries are stored once and indexed by every written and read form, because
 * a lookup arrives as whatever the analyser produced — 食べる from a lemma, but
 * 御飯 or ごはん from a surface. One store, many keys.
 */

export interface RawWord {
  id: string;
  kanji?: Array<{ text: string; common?: boolean }>;
  kana?: Array<{ text: string; common?: boolean }>;
  sense?: Array<{
    partOfSpeech?: string[];
    misc?: string[];
    gloss?: Array<{ text: string; lang?: string }>;
  }>;
}

export interface Entry {
  id: string;
  /** Preferred written form. */
  word: string;
  /** Preferred reading, when the headword is kanji. */
  reading?: string;
  common: boolean;
  senses: Array<{ pos: string[]; glosses: string[]; misc?: string[] }>;
}

/** Every form this entry should be findable by. */
export function keysFor(w: RawWord): string[] {
  const keys = new Set<string>();
  for (const k of w.kanji ?? []) if (k.text) keys.add(k.text);
  for (const k of w.kana ?? []) if (k.text) keys.add(k.text);
  return [...keys];
}

export function toEntry(w: RawWord): Entry | null {
  const senses = (w.sense ?? [])
    .map((s) => ({
      pos: s.partOfSpeech ?? [],
      glosses: (s.gloss ?? []).filter((g) => !g.lang || g.lang === 'eng').map((g) => g.text),
      misc: s.misc?.length ? s.misc : undefined,
    }))
    .filter((s) => s.glosses.length);

  if (!senses.length) return null;

  const kanji = w.kanji?.[0]?.text;
  const kana = w.kana?.[0]?.text;
  const word = kanji ?? kana;
  if (!word) return null;

  return {
    id: w.id,
    word,
    reading: kanji ? kana : undefined,
    common: Boolean(w.kanji?.some((k) => k.common) || w.kana?.some((k) => k.common)),
    senses,
  };
}

/**
 * Rank candidates for a lookup key.
 *
 * An exact written match beats a reading match, and a common word beats a rare
 * homograph — looking up 音 should not surface an obscure entry that merely
 * shares its reading.
 */
export function rank(entries: Entry[], key: string): Entry[] {
  return [...entries].sort((a, b) => {
    const exact = Number(b.word === key) - Number(a.word === key);
    if (exact) return exact;
    const common = Number(b.common) - Number(a.common);
    if (common) return common;
    return a.id.localeCompare(b.id);
  });
}
