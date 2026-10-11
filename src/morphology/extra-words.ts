import type { Entry } from '../dict/jmdict';

/**
 * Words IPADIC does not know, taken from JMdict, for the analyser to know too.
 *
 * IPADIC's word list was last updated in 2007. A word it lacks is split into
 * pieces it has: 盗撮 came back as the verbs 盗る and 撮る, each read と, and
 * 灯籠 as 灯 and 籠, read あかり and かご. JMdict is current and already in the
 * browser, so its nouns are handed to the analyser as extra words.
 *
 * Kept narrow, so the lines IPADIC reads well read the same:
 *   - nouns only, written wholly in kanji, two to four characters;
 *   - one reading — 一日 is いちにち or ついたち, and guessing is worse than
 *     leaving the analyser to it;
 *   - no numbers, which merging reads with the dictionary already;
 *   - only words IPADIC misreads (misreads(), checked with the analyser): split
 *     around a lone kanji, into pieces whose readings do not make the word's.
 *     自由時間 is left out — 自由 + 時間 is right, and both are words a learner
 *     knows — while 盗撮, read と + と, goes in;
 *   - a weak score (EXTRA_COST), so an added word wins only where IPADIC had
 *     nothing good. Lindera's simple format scores an added word -10000, which
 *     would win almost everywhere.
 *
 * Measured (scripts/compare-words.mjs) on 20,000 Tatoeba sentences, the test
 * videos' 428 subtitle lines and the parser fixtures: 14 lines change, every
 * one a misreading put right — 何曜日, 最終章, 角部屋 aside, 金糸瓜 was キム +
 * ヘチマ — and none for the worse.
 */

export type ExtraKind = 'general' | 'suru' | 'na';

export interface ExtraWord {
  surface: string;
  /** Katakana, as IPADIC writes readings. */
  reading: string;
  kind: ExtraKind;
}

/**
 * The score an added word carries. Lower wins; IPADIC's ordinary nouns sit in
 * the thousands. Set by measuring real lines with and without the list: at
 * 6000 a rare 同語 broke 同語族 and 生有 broke 九生有り; at 10000 nothing
 * read well before reads differently, and above it the fixes fall away.
 */
export const EXTRA_COST = 10000;

/** Bumped whenever what goes into the list, or how, changes: a stored list is rebuilt. */
export const EXTRA_FORMAT = 1;

/** IPADIC's context ids for each kind of noun (its left-id.def). */
const CONTEXT: Record<ExtraKind, number> = { general: 1285, suru: 1283, na: 1287 };
const POS1: Record<ExtraKind, string> = { general: '一般', suru: 'サ変接続', na: '形容動詞語幹' };

const KANJI_WORD = /^[一-鿿㐀-䶿々]{2,4}$/u;
const NUMERALS = /[〇一二三四五六七八九十百千万億兆]/u;
/** JMdict's part-of-speech codes for a noun. */
const NOUN = new Set(['n', 'n-adv', 'n-t']);
/** Affixes and counters: not words on their own, whatever else they are. */
const NOT_ALONE = new Set(['suf', 'pref', 'n-suf', 'n-pref', 'ctr', 'num', 'pn']);

const toKatakana = (s: string): string => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

/** What kind of noun an entry is, or null when it is not one this list takes. */
function kindOf(entry: Entry): ExtraKind | null {
  const first = entry.senses[0]?.pos ?? [];
  if (!first.some((p) => NOUN.has(p)) || first.some((p) => NOT_ALONE.has(p))) return null;
  const all = new Set(entry.senses.flatMap((s) => s.pos));
  if (all.has('vs') || all.has('vs-s') || all.has('vs-i')) return 'suru';
  if (all.has('adj-na')) return 'na';
  return 'general';
}

/**
 * JMdict's kanji nouns that could be words IPADIC lacks, each with its one
 * reading, gathered an entry at a time. A spelling two entries read
 * differently is left out.
 */
export function extraCollector(): { add(entry: Entry): void; words(): ExtraWord[] } {
  const seen = new Map<string, ExtraWord | null>();
  return {
    add(entry) {
      const kind = kindOf(entry);
      if (!kind || !entry.reading) return;
      const spellings = entry.forms?.filter((f) => !f.kana && !f.rare).map((f) => f.text) ?? [entry.word];
      for (const surface of spellings) {
        if (!KANJI_WORD.test(surface) || NUMERALS.test(surface)) continue;
        const reading = toKatakana(entry.reading);
        const was = seen.get(surface);
        if (was === undefined) seen.set(surface, { surface, reading, kind });
        else if (was && was.reading !== reading) seen.set(surface, null);   // two readings: no guess
      }
    },
    words: () => [...seen.values()].filter((w): w is ExtraWord => w !== null),
  };
}

/** The same, from entries in hand. */
export function extraCandidates(entries: Iterable<Entry>): ExtraWord[] {
  const c = extraCollector();
  for (const e of entries) c.add(e);
  return c.words();
}

const LONE_KANJI = /^[\u4E00-\u9FFF\u3400-\u4DBF々]$/u;

/**
 * Whether IPADIC misreads a word, given the pieces it splits it into: a lone
 * kanji among them, where it had no word, and their readings not making the
 * word's. 盗撮 comes back 盗 + 撮, read と + と; 自由時間 comes back 自由 + 時間,
 * which is right.
 */
export function misreads(word: ExtraWord, pieces: ReadonlyArray<{ surface: string; reading?: string }>): boolean {
  if (pieces.length === 1 && pieces[0]?.surface === word.surface) return false;
  if (!pieces.some((p) => LONE_KANJI.test(p.surface))) return false;
  return pieces.map((p) => p.reading ?? '?').join('') !== word.reading;
}

/** The words as Lindera's user dictionary reads them: IPADIC's thirteen columns, one row each. */
export function extraRows(words: readonly ExtraWord[], cost = EXTRA_COST): string {
  return words
    .map((w) => [
      w.surface, CONTEXT[w.kind], CONTEXT[w.kind], cost,
      '名詞', POS1[w.kind], '*', '*', '*', '*', w.surface, w.reading, w.reading,
    ].join(','))
    .join('\n');
}
