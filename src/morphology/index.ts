import { ensureAnalyser, improveAnalyser } from './analyser';
import { ChineseSegmenter } from './chinese';
import { APART, FRENCH, splitElisions, straighten } from './french';
import { GERMAN, GERMAN_COMPOUNDS, splitClitics } from './german';
import { KoreanSegmenter } from './korean';
import { LemmaSegmenter } from './lemma';
import { LinderaSegmenter } from './lindera';
import { settings } from '../settings';
import { SPANISH } from './spanish';
import type { Segmenter } from './types';

/**
 * Which analysis each language gets.
 *
 * Every language starts on the browser's own word boundaries (intl.ts). The
 * ones here are then given more: a dictionary form for each word, and a
 * reading where the script wants one. A language joins by a line in one of
 * these tables and a segmenter behind the `Segmenter` interface — nothing
 * that draws words has to hear of it.
 */

/**
 * Languages the analyser in the offscreen document reads, each with the
 * Lindera dictionary it is read with (src/morphology/dictionaries.ts has
 * where each is downloaded from) and the segmenter over what comes back.
 * The three lay their columns out differently, so each has its own reader
 * there and its own rules here.
 */
const ANALYSED: Record<string, { dict: string; make: () => Segmenter }> = {
  ja: { dict: 'ipadic', make: () => new LinderaSegmenter() },
  ko: { dict: 'ko-dic', make: () => new KoreanSegmenter() },
  zh: { dict: 'cc-cedict', make: () => new ChineseSegmenter() },
  // Read with the same analyser: Cantonese is written in the same characters, and its dictionary reads them in Jyutping.
  yue: { dict: 'cc-cedict', make: () => new ChineseSegmenter() },
};

/**
 * Languages written with spaces, whose dictionary lists every inflected form
 * with the word it is a form of. The browser finds the words and the
 * dictionary their dictionary forms, so there is nothing more to download.
 */
/** The Underline articles and pronouns setting, as it stands when a line is analysed. */
const grammarCounts = (): boolean => settings().underlineGrammar;

const BY_FORMS: Record<string, () => Segmenter> = {
  es: () => new LemmaSegmenter('es', SPANISH, { grammarCounts }),
  fr: () => new LemmaSegmenter('fr', FRENCH, { prepare: splitElisions, fold: straighten, grammarCounts, joinHyphens: { apart: APART } }),
  de: () => new LemmaSegmenter('de', GERMAN, {
    prepare: splitClitics, fold: straighten, grammarCounts, compounds: GERMAN_COMPOUNDS, joinHyphens: { apart: /^$/ },
  }),
};

/** What turns a language's lines into words with dictionary forms. */
export interface Analyser {
  /** Bring in whatever it reads with — a download, the first time. */
  load(): Promise<{ ok: boolean; error?: string }>;
  /**
   * What makes it read better and may come long after it has loaded. Resolves
   * true when lines read before then should be read again.
   */
  improve?(): Promise<boolean>;
  /** A segmenter over it, with no lines remembered. */
  make(): Segmenter;
}

/** The language's analyser, or null where there are only boundaries to go on. */
export function analyserFor(lang: string): Analyser | null {
  const analysed = ANALYSED[lang];
  if (analysed) return { load: () => ensureAnalyser(analysed.dict), improve: improveAnalyser, make: analysed.make };
  const byForms = BY_FORMS[lang];
  if (byForms) return { load: async () => ({ ok: true }), make: byForms };
  return null;
}
