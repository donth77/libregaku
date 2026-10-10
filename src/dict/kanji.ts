/**
 * Per-character detail from KANJIDIC2: what each kanji in a word means, and
 * how it reads.
 *
 * Seeing 勉 "exertion" and 強 "strong" inside 勉強 is how the next word with
 * either one stops being a stranger. KANJIDIC2 is the EDRDG's, like JMdict,
 * under the same licence, and comes repackaged as JSON in the same release.
 */

/** One character as the lookup card shows it. */
export interface CharacterInfo {
  char: string;
  /** In the learner's language where KANJIDIC2 has it, English otherwise. */
  meanings: string[];
  /** Readings borrowed from Chinese, in katakana. */
  on: string[];
  /** Native readings, in hiragana; a dot marks where the okurigana starts. */
  kun: string[];
  strokes?: number;
}

/** A character as stored: meanings in every language KANJIDIC2 carries. */
export interface StoredKanji {
  char: string;
  meanings: Record<string, string[]>;
  on: string[];
  kun: string[];
  strokes?: number;
}

/** The parts of jmdict-simplified's kanjidic2 record this reads. */
interface RawKanji {
  literal?: string;
  misc?: { strokeCounts?: number[] };
  readingMeaning?: {
    groups?: Array<{
      readings?: Array<{ type?: string; value?: string }>;
      meanings?: Array<{ lang?: string; value?: string }>;
    }>;
  } | null;
}

export function toKanji(raw: unknown): StoredKanji | null {
  const r = raw as RawKanji | null;
  if (!r?.literal) return null;
  const meanings: Record<string, string[]> = {};
  const on: string[] = [];
  const kun: string[] = [];
  for (const group of r.readingMeaning?.groups ?? []) {
    for (const reading of group.readings ?? []) {
      if (!reading.value) continue;
      if (reading.type === 'ja_on') on.push(reading.value);
      else if (reading.type === 'ja_kun') kun.push(reading.value);
    }
    for (const m of group.meanings ?? []) {
      if (!m.value || !m.lang) continue;
      (meanings[m.lang] ??= []).push(m.value);
    }
  }
  const strokes = r.misc?.strokeCounts?.[0];
  return { char: r.literal, meanings, on, kun, ...(strokes ? { strokes } : {}) };
}

/**
 * KANJIDIC2's language codes for the languages definitions can be shown in.
 * It has English, French, Spanish and Portuguese; anything else reads English.
 */
const KANJIDIC_LANG: Record<string, string> = { en: 'en', fr: 'fr', es: 'es', pt: 'pt' };

export function forLanguage(k: StoredKanji, native: string): CharacterInfo {
  const lang = KANJIDIC_LANG[native] ?? 'en';
  return {
    char: k.char,
    meanings: k.meanings[lang]?.length ? k.meanings[lang] : (k.meanings.en ?? []),
    on: k.on,
    kun: k.kun,
    ...(k.strokes ? { strokes: k.strokes } : {}),
  };
}

/** The kanji in a word, once each, in order. 々 repeats the one before and has no entry. */
export function kanjiIn(word: string): string[] {
  return [...new Set(Array.from(word).filter((c) => /[㐀-䶿一-鿿豈-﫿]/.test(c)))];
}
