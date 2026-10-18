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

/** Bumped whenever what goes into the lists, or how, changes: stored lists are rebuilt. */
export const EXTRA_FORMAT = 3;

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

/* ── Words IPADIC reads the rarer way ─────────────────────────── */

/**
 * 日本 is ニッポン to IPADIC — and to UniDic, so no second opinion puts it
 * right. JMdict has the one word, にほん, with にっぽん listed after it: the same
 * word, said the rarer way. Where IPADIC has a word whole and reads it by a
 * reading the dictionary lists after the word's first, the first is shown:
 * 日本人, 明後日 (ミョウゴニチ for あさって), 白髪 (ハクハツ for しらが), 鶏肉
 * (ケイニク for とりにく), この間 (コノカン for このあいだ).
 *
 * Only that. A reading that is some other word's first under the same
 * spelling is another word, and which of the two a line has is not this
 * list's to say: 大丈夫 is だいじょうぶ, and だいじょうふ, a fine figure of a
 * man, is its own entry. Nor numbers, which read by what they count (四 is
 * よん and し). The list is made once, with the analyser, like the words above:
 * a word is on it only if IPADIC, given the word alone, reads it so.
 */
export interface FirstReading {
  surface: string;
  /** IPADIC's reading, in katakana. */
  from: string;
  /** The dictionary's first reading of the word, in katakana. */
  to: string;
  /**
   * IPADIC, given the word alone, takes it for a name: 日本. A word it takes
   * for a name only in a line is left as it reads it there: 山下さん is
   * やました, though 山下, the foot of a mountain, is さんか first.
   */
  name?: boolean;
}

/**
 * Each spelling with a reading listed after its word's first, gathered an
 * entry at a time: those readings, and the first they stand behind. A reading
 * two words list behind different firsts is left out.
 */
export function firstReadingCollector(): { add(entry: Entry): void; candidates(): Map<string, Map<string, string>> } {
  const seen = new Map<string, Map<string, string | null>>();
  return {
    add(entry) {
      if (!entry.reading || !entry.forms) return;
      const first = toKatakana(entry.reading);
      const later = entry.forms.filter((f) => f.kana).map((f) => toKatakana(f.text)).filter((k) => k !== first);
      if (!later.length) return;
      for (const form of entry.forms) {
        if (form.kana || form.rare) continue;
        const readings = seen.get(form.text) ?? new Map<string, string | null>();
        seen.set(form.text, readings);
        for (const k of later) readings.set(k, readings.has(k) && readings.get(k) !== first ? null : first);
      }
    },
    candidates() {
      const out = new Map<string, Map<string, string>>();
      for (const [surface, readings] of seen) {
        const sure = new Map([...readings].filter((r): r is [string, string] => r[1] !== null));
        if (sure.size) out.set(surface, sure);
      }
      return out;
    },
  };
}

/** One of the analyser's pieces for a word given to it alone, as far as this list reads it. */
export interface AnalysedPiece {
  surface: string;
  reading?: string;
  /** Its dictionary form. */
  lemma?: string;
  /** IPADIC's part of speech and its two finer kinds: 名詞, 固有名詞, 人名. */
  pos?: string;
  pos1?: string;
  pos2?: string;
}

const HAS_KANJI = /[一-鿿㐀-䶿々]/u;
const KANA_RUN = /[ぁ-ゖァ-ヺー]+/gu;

/** How many kana must be dropped, added or changed to make one reading of the other, as far as `limit`. */
function apart(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length]!;
}

/**
 * What IPADIC's reading of a word alone is put right to, or null. The word
 * must come back whole, in its dictionary form, read by one of the readings
 * the dictionary lists after the first. Left as they are:
 *
 *   - a spelling with no kanji: ＣＤ is シーディー, and the dictionary's
 *     シー・ディー is no better over it;
 *   - a number, an ending or a prefix, which read by where they stand: 四 is
 *     よん and し, 最新版 is ばん where 版 alone is はん;
 *   - a person's name: 千尋 is ちひろ, not せんじん, a great depth, and 山下
 *     やました, not さんか, the foot of a mountain;
 *   - any other name, unless the two readings are the one name said two ways,
 *     a kana or two apart: 日本 and 東日本, but not 青山, あおやま, a place,
 *     and せいざん, a green hill;
 *   - a reading that changes kana the word is written with: ヒンズー教 is not
 *     ヒンドゥーきょう.
 */
export function firstReadingOf(surface: string, later: ReadonlyMap<string, string>, pieces: ReadonlyArray<AnalysedPiece>): FirstReading | null {
  const [whole] = pieces;
  if (pieces.length !== 1 || !whole || whole.surface !== surface || !whole.reading || !HAS_KANJI.test(surface)) return null;
  if ((whole.lemma ?? surface) !== surface) return null;
  if (whole.pos1 === '数' || whole.pos1 === '接尾' || whole.pos === '接頭詞') return null;
  const to = later.get(whole.reading);
  if (!to) return null;
  if (whole.pos1 === '固有名詞' && (whole.pos2 === '人名' || apart(whole.reading, to, 2) > 2)) return null;
  // Each stretch of kana in the spelling, in turn, still in the reading.
  let at = 0;
  for (const run of surface.match(KANA_RUN) ?? []) {
    at = to.indexOf(toKatakana(run), at);
    if (at < 0) return null;
    at += run.length;
  }
  return { surface, from: whole.reading, to, ...(whole.pos1 === '固有名詞' ? { name: true } : {}) };
}

/** IPADIC's reading of each spelling alone, where it is one the dictionary lists after the word's first. */
export function firstReadingsBy(
  candidates: ReadonlyMap<string, ReadonlyMap<string, string>>, read: (surface: string) => AnalysedPiece[],
): FirstReading[] {
  const out: FirstReading[] = [];
  for (const [surface, later] of candidates) {
    const found = firstReadingOf(surface, later, read(surface));
    if (found) out.push(found);
  }
  return out;
}

/**
 * The list without the words some dictionary word of the same spelling reads
 * IPADIC's way first: that reading is another word. `words` is what the
 * dictionary says each spelling stands for (lexicon() in src/dict/store.ts).
 */
export function firstReadingsKept(
  list: readonly FirstReading[], words: (surface: string) => ReadonlyArray<{ reading: string }> | undefined,
): FirstReading[] {
  return list.filter((r) => !words(r.surface)?.some((w) => toKatakana(w.reading) === r.from));
}

/** The list as it is kept: a word a line, its two readings after it, and "name" where it is one. */
export function firstReadingRows(list: readonly FirstReading[]): string {
  return list.map((r) => [r.surface, r.from, r.to, ...(r.name ? ['name'] : [])].join('\t')).join('\n');
}

/** The kept list, by word. */
export function firstReadingTable(rows: string): Map<string, FirstReading> {
  const out = new Map<string, FirstReading>();
  for (const line of rows.split('\n')) {
    const [surface, from, to, name] = line.split('\t');
    if (surface && from && to) out.set(surface, { surface, from, to, ...(name ? { name: true } : {}) });
  }
  return out;
}

/**
 * Adverbs of speech the analyser lacks, or has and passes over, each with the
 * score that makes it read right. Not from JMdict: these are kana, where the
 * list above takes kanji nouns only, and each score was set on its own.
 *
 * めちゃ is not in IPADIC at all: めちゃうまい came back め, ちゃう, まい. At
 * 9000, all 31 Tatoeba sentences that change read right, and やめちゃう,
 * しめちゃった and めちゃくちゃ are as they were; at 6000 がめちゃいけない
 * (がめる) was cut wrong.
 *
 * たまに is in IPADIC, which in a line still prefers たま, a ball, and に. A
 * second entry at 4000 lets its own scores for what may follow what decide:
 * ここにはたまに来る is the adverb, and そのたまに, 彼のたまに, 速いたまに and
 * 他のたまに stay the ball. At 3000 そのたまに became the adverb; at 5000
 * ここにはたまに did not. Measured with scripts/measure-word.mjs.
 */
export const SPOKEN_ADVERBS: ReadonlyArray<{ surface: string; reading: string; cost: number }> = [
  { surface: 'めちゃ', reading: 'メチャ', cost: 9000 },
  { surface: 'たまに', reading: 'タマニ', cost: 4000 },
];

/** IPADIC's context id for a plain adverb (副詞,一般). */
const ADVERB = 1281;

/** The adverbs of speech as rows of the same thirteen columns. */
export function spokenRows(): string {
  return SPOKEN_ADVERBS
    .map((w) => [w.surface, ADVERB, ADVERB, w.cost, '副詞', '一般', '*', '*', '*', '*', w.surface, w.reading, w.reading].join(','))
    .join('\n');
}

/** Everything handed to the analyser: JMdict's words, then the adverbs of speech. */
export function analyserRows(words: readonly ExtraWord[], cost = EXTRA_COST): string {
  return [extraRows(words, cost), spokenRows()].filter(Boolean).join('\n');
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
