/**
 * IPADIC alone against IPADIC with UniDic's second opinion (src/morphology/
 * repair.ts), line by line, through the extension's own segmenting steps.
 *
 * Run it before changing what UniDic may correct, or how far behind a reading
 * may be (WITHIN there), and when lindera, IPADIC or UniDic is bumped. Every
 * line whose words change is written out, before and after, to be read: the
 * second opinion should only ever put misreadings right. Run with
 * scripts/compare-unidic.mjs, which builds this first.
 *
 *   node scripts/compare-unidic.mjs
 *   SAMPLE=5000 node scripts/compare-unidic.mjs
 *   FULL=1 node scripts/compare-unidic.mjs          # every Tatoeba sentence, not a spread of them
 *   SHOW='彼はいつ来ますか|癒やす' node scripts/compare-unidic.mjs   # each analyser's words for these lines, and the line both ways
 *   REREAD=1 FULL=1 node scripts/compare-unidic.mjs # what reading again written out (katakana-words.ts) changes on its own
 *   FIRST=1 FULL=1 node scripts/compare-unidic.mjs  # what the dictionary's first reading changes: 日本, にっぽん to にほん (extra-words.ts)
 *   WRITE=1 node scripts/compare-unidic.mjs         # write the parser fixtures again, as the extension now reads their lines
 *   WRITE=1 MORE='新しい行|もう一つ' node scripts/compare-unidic.mjs   # and add these lines to them
 *   READINGS=1 node scripts/compare-unidic.mjs      # words in kanji against the readings in Tatoeba's word index
 *   VERBS=base node scripts/compare-unidic.mjs      # verbs in kana: the entry each card opens, saved to compare with
 *   VERBS=1 node scripts/compare-unidic.mjs         # the same against that, every card put right and put wrong
 *   VERBS=write node scripts/compare-unidic.mjs     # learn which verb a verb in kana is, and write src/dict/kana-verbs.ts
 *   VERBS=write HALF=1 …, then VERBS=1 ODD=1 …      # learn from the even sentence ids, measure on the odd
 *
 * VERBS=1 is the same index for verbs: つく written in kana is 付く, 着く,
 * 就く or 吐く, and the index says which. Each card is opened as the extension
 * opens it, its keys in turn ranked by rank() in src/dict/jmdict.ts, and
 * counted right where the entry is the index's verb.
 *
 * READINGS=1 measures the one thing reading the lines cannot: which word a
 * spelling is, 金 as かね or きん. Tatoeba's index (the Tanaka corpus's, made by
 * hand) names the dictionary word for each word of 150,000 sentences, with
 * its reading where the spelling has more than one. Each such word is read
 * with UniDic's reading of it taken where the merge takes it (secondOpinions()
 * in merge.ts) and without, and counted right where the reading is one of
 * that dictionary word's. The words that change are written out, the ones put
 * right and the ones put wrong: read both lists before changing that rule.
 * The index says which word, not how it is said — 何ですか is 何, なに, to it —
 * so a rule about how a word is said cannot be measured against it.
 *
 * Lines: the parser fixtures, any .vtt subtitle files in the cache's subs/
 * folder, and a spread of Tatoeba's Japanese sentences. Data is in
 * node_modules/.cache/libregaku-words: IPADIC, JMdict and Tatoeba from
 * compare-words (run that once first), UniDic downloaded here.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import init, {
  TokenizerBuilder, loadDictionaryFromBytes, loadUserDictionaryFromBytes, type Tokenizer,
} from 'lindera-wasm';
import { keysFor, rank, toEntry, wordsFor, type Entry, type RawWord } from '../src/dict/jmdict';
import { LINDERA_DICTS } from '../src/morphology/dictionaries';
import {
  analyserRows, extraCollector, firstReadingCollector, firstReadingsBy, firstReadingsKept, misreads, type AnalysedPiece, type FirstReading,
} from '../src/morphology/extra-words';
import { IPADIC, READINGS, fromIpadic, readJapanese, withFirstReadings, type Analysers, type Row } from '../src/morphology/japanese';
import { forAnalysis, segmentWith } from '../src/morphology/lindera';
import { before, lexiconQueries, type LexiconEntry, type Morpheme } from '../src/morphology/merge';
import { repair, type Reading } from '../src/morphology/repair';
import type { Token } from '../src/morphology/types';
import { fromUnidic, type UnidicMorpheme } from '../src/morphology/unidic';
import { LINES as FIXTURES } from '../src/morphology/__tests__/fixtures/ipadic';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = `${ROOT}node_modules/.cache/libregaku-words`;
const FIXTURES_AT = `${ROOT}src/morphology/__tests__/fixtures`;
const SAMPLE = Number(process.env.SAMPLE ?? 20000);

const json = existsSync(CACHE) ? readdirSync(CACHE).find((f) => /^jmdict-eng.*\.json$/.test(f)) : undefined;
if (!json || !existsSync(`${CACHE}/ipadic.zip.done`)) {
  console.error('No data yet: run `node scripts/compare-words.mjs` once, which downloads IPADIC, JMdict and Tatoeba.');
  process.exit(1);
}
if (!existsSync(`${CACHE}/unidic.zip.done`)) {
  console.log(`downloading ${LINDERA_DICTS.unidic}`);
  execFileSync('curl', ['-sSL', '-o', `${CACHE}/unidic.zip`, LINDERA_DICTS.unidic!]);
  execFileSync('unzip', ['-o', '-q', `${CACHE}/unidic.zip`, '-d', `${CACHE}/unidic`]);
  writeFileSync(`${CACHE}/unidic.zip.done`, '');
}

await init({ module_or_path: readFileSync(`${ROOT}node_modules/lindera-wasm/lindera_wasm_bg.wasm`) });
const dictionary = (name: string) => {
  const D = `${CACHE}/${name}/${readdirSync(`${CACHE}/${name}`)[0]}`;
  const file = (n: string): Uint8Array => new Uint8Array(readFileSync(`${D}/${n}`));
  return loadDictionaryFromBytes(
    file('metadata.json'), file('dict.trie'), file('dict.valsidx'), file('dict.vals'),
    file('dict.wordsidx'), file('dict.words'), file('matrix.mtx'), file('char_def.bin'), file('unk.bin'),
  );
};
type Raw = { surface: string; details?: string[] };
const rows = (raw: unknown): Row[] => (raw as Raw[]).map((x) => ({ surface: x.surface, details: x.details ?? [] }));

// JMdict in memory, answering as the store does (lexicon() there).
const raw = JSON.parse(readFileSync(`${CACHE}/${json}`, 'utf8')) as { words: RawWord[] };
const byForm = new Map<string, Entry[]>();
const collect = extraCollector();
const later = firstReadingCollector();
for (const w of raw.words) {
  const e = toEntry(w, 'eng');
  if (!e) continue;
  collect.add(e);
  later.add(e);
  for (const f of keysFor(w)) byForm.set(f, [...(byForm.get(f) ?? []), e]);
}
function lexicon(forms: string[]): Record<string, LexiconEntry[]> {
  const out: Record<string, LexiconEntry[]> = {};
  for (const form of new Set(forms)) {
    const words = wordsFor(byForm.get(form) ?? [], form);
    if (words.length) out[form] = words;
  }
  return out;
}

// IPADIC with the words JMdict adds, as the offscreen document builds it (loadExtras() there), and UniDic.
const plain = new TokenizerBuilder().setDictionaryInstance(dictionary('ipadic')).setMode('normal').build();
const added = collect.words().filter((w) =>
  misreads(w, rows(plain.tokenize(w.surface)).map((t) => ({ surface: t.surface, reading: fromIpadic(t.surface, t.details).reading }))));
const withWords = dictionary('ipadic');
const user = loadUserDictionaryFromBytes(new TextEncoder().encode(analyserRows(added)), withWords.metadata);
const ipadic: Tokenizer = new TokenizerBuilder().setDictionaryInstance(withWords).setUserDictionaryInstance(user).setMode('normal').build();
const unidic: Tokenizer = new TokenizerBuilder().setDictionaryInstance(dictionary('unidic')).setMode('normal').build();

// The words IPADIC reads the rarer way, listed as the offscreen document lists them (loadExtras() there).
const star = (v: string | undefined): string | undefined => (v && v !== '*' ? v : undefined);
const pieces = (surface: string): AnalysedPiece[] => rows(plain.tokenize(surface)).map((t) => ({
  surface: t.surface, reading: star(t.details[IPADIC.reading]), lemma: star(t.details[IPADIC.base]),
  pos: star(t.details[IPADIC.pos]), pos1: star(t.details[IPADIC.pos1]), pos2: star(t.details[IPADIC.pos2]),
}));
const readByLater = firstReadingsBy(later.candidates(), pieces);
const spelled = lexicon(readByLater.map((r) => r.surface));
const firstReadings = new Map<string, FirstReading>(firstReadingsKept(readByLater, (surface) => spelled[surface]).map((r) => [r.surface, r]));

// The analysers as analyse() in offscreen.ts hands them to readJapanese(): IPADIC before anything else has
// loaded, IPADIC with the words JMdict adds and the list above, and that with UniDic.
const bare: Analysers = { ipadic: (text) => rows(plain.tokenize(text)) };
const alone: Analysers = { ipadic: (text) => rows(ipadic.tokenize(text)), firstReadings };
const both: Analysers = {
  ...alone,
  others: (text, within) =>
    (ipadic.tokenizeNbest(text, READINGS, true, BigInt(within)) as Array<{ tokens: Raw[]; cost: number | bigint }>)
      .map((r) => ({ rows: rows(r.tokens), cost: Number(r.cost) })),
  unidic: (text) => rows(unidic.tokenize(text)),
};
type Read = (text: string) => Morpheme[];
/** IPADIC's rows as they come, with nothing read again. */
const asItComes: Read = (text) => alone.ipadic(text).map((row) => fromIpadic(row.surface, row.details));
const readAlone: Read = (text) => readJapanese(text, alone);
const readBoth: Read = (text) => readJapanese(text, both);
const via = (read: Read) => async (text: string) => {
  const tokens = read(text);
  return { ok: true, tokens, lexicon: lexicon(lexiconQueries(tokens)), complete: true };
};
const show = (t: { surface: string; lemma?: string; reading?: string; content: boolean; inflections?: string[] }): string =>
  t.content ? `${t.surface}${t.lemma && t.lemma !== t.surface ? `→${t.lemma}` : ''}${t.reading ? `(${t.reading})` : ''}${t.inflections?.length ? `[${t.inflections.join(',')}]` : ''}` : t.surface;
const line = async (text: string, read: Read): Promise<string> => (await segmentWith(text, via(read))).tokens.map(show).join(' ');
const words = (ms: Morpheme[]): string =>
  ms.map((m) => `${m.surface}[${m.pos ?? ''}${m.pos1 ? `,${m.pos1}` : ''}|${m.lemma ?? ''}|${m.reading ?? ''}|${m.conjForm ?? ''}]`).join(' ');

if (process.env.SHOW) {
  for (const text of process.env.SHOW.split('|').filter(Boolean)) {
    console.log(text);
    console.log(`   ipadic:  ${words(readAlone(text))}`);
    console.log(`   unidic:  ${words(fromUnidic(both.unidic!(text)))}`);
    console.log(`   both:    ${words(readBoth(text))}`);
    console.log(`   before -> ${await line(text, readAlone)}`);
    console.log(`   after  -> ${await line(text, readBoth)}`);
  }
  process.exit(0);
}

// WRITE=1: the fixtures' lines, and any in MORE, as the extension reads them now.
if (process.env.WRITE) {
  const lines = [...new Set([...Object.keys(FIXTURES), ...(process.env.MORE ?? '').split('|').filter(Boolean)])];
  const entry = (text: string, morphemes: Morpheme[]): string =>
    `  ${JSON.stringify(text)}: ${JSON.stringify({ morphemes, lexicon: lexicon(lexiconQueries(morphemes)) })},`;
  const same = (a: Morpheme[], b: Morpheme[]): boolean => JSON.stringify(a) === JSON.stringify(b);
  const whole: string[] = [];
  const early: string[] = [];
  const opinions: string[] = [];
  for (const text of lines) {
    const morphemes = readBoth(text);
    whole.push(entry(text, morphemes));
    // Before JMdict's words and UniDic are in: the line as the page first shows it, where that differs.
    const first = readJapanese(text, bare);
    if (!same(first, morphemes)) early.push(entry(text, first));
    // What the second opinion was given, where it changed the reading: repair() is run on it again in the tests.
    // IPADIC's words as repair() gets them, before the list of first readings is applied to what it returns.
    const mine = readJapanese(text, { ...alone, firstReadings: undefined });
    if (same(mine, morphemes) || mine.map((m) => m.surface).join('') !== text) continue;
    const asked: Record<string, Reading[]> = {};
    const reread: Record<string, UnidicMorpheme[]> = {};
    const theirs = fromUnidic(both.unidic!(text));
    const again = repair(mine, theirs, (t, within) => {
      const readings = both.others!(t, within).map((r) => ({ words: r.rows.map((row) => fromIpadic(row.surface, row.details)), cost: r.cost }));
      asked[t] = readings;
      return readings;
    }, (t) => (reread[t] = fromUnidic(both.unidic!(t))));
    if (!same(withFirstReadings(again, firstReadings), morphemes)) throw new Error(`${text}: repair() alone reads it differently from readJapanese()`);
    // The words of the line that are on the list of first readings, for the tests to apply as readJapanese() does.
    const listed = again.map((m) => firstReadings.get(m.surface)).filter((r): r is FirstReading => Boolean(r));
    opinions.push(`  ${JSON.stringify(text)}: ${JSON.stringify({
      ipadic: mine, unidic: theirs, others: asked,
      ...(Object.keys(reread).length ? { again: reread } : {}), ...(listed.length ? { first: listed } : {}),
    })},`);
  }
  const main = `${FIXTURES_AT}/ipadic.ts`;
  const source = readFileSync(main, 'utf8');
  const head = source.slice(0, source.indexOf('export const LINES'));
  writeFileSync(main, `${head}export const LINES: Record<string, Analysed> = {
${whole.join('\n')}
};

/** The same lines as IPADIC alone reads them, before JMdict's words and UniDic have loaded: those it reads differently. */
export const ALONE: Record<string, Analysed> = {
${early.join('\n')}
};
`);
  const second = `${FIXTURES_AT}/second-opinion.ts`;
  writeFileSync(second, `/**
 * What repair() was given for the parser fixture's lines that UniDic's second opinion changed: IPADIC's
 * words, UniDic's in IPADIC's shape, IPADIC's other readings of each run it was asked about, what
 * UniDic was asked to read again, and the words of the line whose reading the dictionary's first replaces.
 *
 * lindera-wasm 6.0.0 with lindera-ipadic-6.0.0 and lindera-unidic-6.0.0. Written by
 * scripts/compare-unidic.mjs (WRITE=1) with fixtures/ipadic.ts: regenerate rather than hand-edit.
 */
import type { FirstReading } from '../../extra-words';
import type { Morpheme } from '../../merge';
import type { Reading } from '../../repair';
import type { UnidicMorpheme } from '../../unidic';

export const SECOND: Record<string, {
  ipadic: Morpheme[]; unidic: UnidicMorpheme[]; others: Record<string, Reading[]>; again?: Record<string, UnidicMorpheme[]>;
  first?: FirstReading[];
}> = {
${opinions.join('\n')}
};
`);
  console.log(`${whole.length} lines written to ${main}: ${early.length} read differently by IPADIC alone, ${opinions.length} changed by UniDic (${second})`);
  process.exit(0);
}

/** Tatoeba's word index, by sentence id: each word as head(reading)[sense]{as written}~. */
function wordIndex(): Map<string, string> {
  if (!existsSync(`${CACHE}/jpn_indices.done`)) {
    const from = 'https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2';
    console.log(`downloading ${from}`);
    execFileSync('curl', ['-sSL', '-o', `${CACHE}/jpn_indices.tar.bz2`, from]);
    execFileSync('tar', ['-xjf', `${CACHE}/jpn_indices.tar.bz2`, '-C', CACHE, 'jpn_indices.csv']);
    writeFileSync(`${CACHE}/jpn_indices.done`, '');
  }
  const index = new Map<string, string>();
  for (const l of readFileSync(`${CACHE}/jpn_indices.csv`, 'utf8').split('\n')) {
    const [id, , text] = l.split('\t');
    if (id && text) index.set(id, text);
  }
  return index;
}
const WORD = /^([^(\[{~|]+)(?:\|\d+)?(?:\(([^)]*)\))?(?:\[\d+\])*(?:\{([^}]*)\})?~?$/u;
const HAN = /[\u4E00-\u9FFF\u3400-\u4DBF々]/u;

// READINGS=1: words in kanji against the readings in Tatoeba's word index, with UniDic's reading of a word and without.
if (process.env.READINGS) {
  const index = wordIndex();
  const hira = (s: string): string => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  /** A spelling in kanji, and each dictionary word's readings of it. */
  const readingsFor = new Map<string, string[][]>();
  for (const w of raw.words) {
    for (const k of w.kanji ?? []) {
      const readings = (w.kana ?? [])
        .filter((r) => !r.appliesToKanji || r.appliesToKanji.includes('*') || r.appliesToKanji.includes(k.text))
        .map((r) => hira(r.text));
      readingsFor.set(k.text, [...(readingsFor.get(k.text) ?? []), readings]);
    }
  }
  /** Every reading of the dictionary word a spelling and one reading name. */
  const wordOf = (head: string, reading: string): Set<string> =>
    new Set([reading, ...(readingsFor.get(head) ?? []).filter((rs) => rs.includes(reading)).flat()]);

  interface Indexed { at: number; end: number; head: string; reading: string; form: string }
  /** The words in kanji the index gives a reading, each with where it stands in the sentence. */
  const indexed = (text: string, entry: string): Indexed[] => {
    const out: Indexed[] = [];
    let cursor = 0;
    for (const w of entry.split(' ')) {
      const [, head, reading, written] = WORD.exec(w) ?? [];
      const form = written ?? head;
      const at = form ? text.indexOf(form, cursor) : -1;
      if (!head || !form || at < 0) continue;
      cursor = at + form.length;
      // (#2028980) is an entry's number, not a reading.
      if (reading && !reading.startsWith('#') && HAN.test(form) && HAN.test(head)) out.push({ at, end: cursor, head, reading: hira(reading), form });
    }
    return out;
  };
  /** The line without what UniDic says of how its words in kanji read. */
  const without: Read = (text) => readBoth(text).map((m) => {
    const { second: _second, ...word } = m;
    return word;
  });
  /** What a reading of the sentence makes of an indexed word: its reading, or why it has none to compare. */
  const said = async (text: string, read: Read, words: Indexed[]): Promise<string[]> => {
    const tokens = (await segmentWith(text, via(read))).tokens;
    return words.map((w) => {
      const t = tokens.find((x) => x.start === w.at);
      if (!t) return '(cut differently)';
      if (t.end !== w.end && t.lemma !== w.head) return `(${t.surface})`;
      const r = t.lemma === w.head || t.surface !== w.form ? t.lemmaReading ?? (t.lemma === t.surface ? t.reading : undefined) : t.reading;
      return r ? hira(r) : '(unread)';
    });
  };
  const sentences = readFileSync(`${CACHE}/jpn.tsv`, 'utf8').split('\n').map((l) => l.split('\t')).filter((p) => p[2] && index.has(p[0]!));
  const tally = { words: 0, before: 0, after: 0 };
  const better = new Map<string, { n: number; eg: string }>();
  const worse = new Map<string, { n: number; eg: string }>();
  const note = (list: Map<string, { n: number; eg: string }>, key: string, eg: string): void => {
    const kind = list.get(key);
    if (kind) kind.n++;
    else list.set(key, { n: 1, eg });
  };
  for (const [id, , text] of sentences as Array<[string, string, string]>) {
    const words = indexed(text, index.get(id)!);
    if (!words.length) continue;
    const [was, now] = [await said(text, without, words), await said(text, readBoth, words)];
    words.forEach((w, k) => {
      const right = wordOf(w.head, w.reading);
      const [a, b] = [right.has(was[k]!), right.has(now[k]!)];
      tally.words++;
      if (a) tally.before++;
      if (b) tally.after++;
      if (a !== b) note(b ? better : worse, `${w.head}\t${w.reading}\t${was[k]} -> ${now[k]}`, text);
    });
  }
  const total = (list: Map<string, { n: number }>): number => [...list.values()].reduce((n, k) => n + k.n, 0);
  const listed = (list: Map<string, { n: number; eg: string }>): string =>
    [...list].sort((x, y) => y[1].n - x[1].n).map(([k, v]) => `${v.n}\t${k}\t${v.eg}`).join('\n');
  const out = `${CACHE}/readings-report.txt`;
  writeFileSync(out, `PUT RIGHT: ${total(better)} words, ${better.size} kinds\n${listed(better)}\n\nPUT WRONG: ${total(worse)} words, ${worse.size} kinds\n${listed(worse)}\n`);
  const pct = (n: number): string => `${(100 * n / tally.words).toFixed(2)}%`;
  console.log(`${tally.words} words in kanji that the index gives a reading, in ${sentences.length} sentences`);
  console.log(`read as the index has them: ${tally.before} (${pct(tally.before)}) without UniDic's reading of a word, ${tally.after} (${pct(tally.after)}) with`);
  console.log(`${total(better)} put right, ${total(worse)} put wrong: ${out}`);
  process.exit(0);
}

const KANA = /^[ぁ-ゖー]+$/u;
/** The verbs in kanji of a sentence's index that the sentence writes in kana, each with where it stands. */
const verbsIn = (text: string, entry: string): Array<{ at: number; head: string }> => {
  const verbs: Array<{ at: number; head: string }> = [];
  let cursor = 0;
  for (const w of entry.split(' ')) {
    const [, head, , written] = WORD.exec(w) ?? [];
    const form = written ?? head;
    const at = form ? text.indexOf(form, cursor) : -1;
    if (!head || !form || at < 0) continue;
    cursor = at + form.length;
    if (HAN.test(head) && KANA.test(form) && /[うくぐすつぬぶむる]$/u.test(head)) verbs.push({ at, head });
  }
  return verbs;
};
/** The index's verb is one the word in kana is, as the line spells it: not させる for する. */
const spelledAs = (head: string, kana: string): boolean => (byForm.get(head) ?? []).some((e) => e.forms?.some((f) => f.kana && f.text === kana));
/** Tatoeba's sentences: id, and the sentence. HALF=1 and ODD=1 keep the even ids and the odd. */
const tatoebaRows = readFileSync(`${CACHE}/jpn.tsv`, 'utf8').split('\n').map((l) => l.split('\t')).filter((p) => p[0] && p[2])
  .filter((p) => (process.env.HALF ? Number(p[0]) % 2 === 0 : process.env.ODD ? Number(p[0]) % 2 === 1 : true))
  .map((p) => [p[0], p[2]] as [string, string]);

// VERBS=write: which verb in kanji each verb in kana is, by the words before it or by what it most often is,
// learned from Tatoeba and written to src/dict/kana-verbs.ts (followedVerbs() in src/morphology/merge.ts reads
// what a verb follows, rank() in src/dict/jmdict.ts the table). HALF=1 learns from the sentences with even ids
// only, for VERBS=1 ODD=1 to measure on the others.
if (process.env.VERBS === 'write') {
  const index = wordIndex();
  type Counts = Map<string, Map<string, number>>;
  const add = (counts: Counts, key: string, verb: string): void => {
    const m = counts.get(key) ?? new Map<string, number>();
    counts.set(key, m);
    m.set(verb, (m.get(verb) ?? 0) + 1);
  };
  /** A kana verb's verbs in kanji, by how often the index names each. */
  const usual: Counts = new Map();
  /** A kana verb and what stands before it, tab apart: the verbs in kanji it is there. */
  const after: Counts = new Map();
  const hira = (s: string): string => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  /** The kana dictionary form of a verb in kanji, as its reading in the line begins: 付く read ツイ is つく. */
  const kanaOf = (m: Morpheme): string | undefined => {
    const said = hira(m.reading ?? '');
    const forms = new Set<string>();
    for (const e of byForm.get(m.lemma ?? '') ?? []) {
      if (!e.senses.some((s) => s.pos.some((p) => /^v/.test(p)))) continue;
      for (const f of e.forms ?? []) if (f.kana && !f.rare && f.text.length > 1 && said.startsWith(f.text.slice(0, -1))) forms.add(f.text);
    }
    return [...forms].sort((a, b) => b.length - a.length)[0];
  };
  // Every verb written in kanji, with what stands before it.
  for (const [, text] of tatoebaRows) {
    const ms = readBoth(text);
    ms.forEach((m, i) => {
      if (m.pos !== '動詞' || m.pos1 !== '自立' || !m.lemma || !HAN.test(m.surface) || !HAN.test(m.lemma)) return;
      const kana = kanaOf(m);
      const at = kana ? before(ms, i) : undefined;
      if (at) add(after, `${kana}\t${at}`, m.lemma);
    });
  }
  // Every verb written in kana that the index names: what it is, and what stands before it.
  for (const [id, text] of tatoebaRows) {
    const words = index.get(id);
    const verbs = words ? verbsIn(text, words) : [];
    if (!verbs.length) continue;
    const ms = readBoth(text);
    const starts = ms.map((_, i) => ms.slice(0, i).reduce((n, m) => n + m.surface.length, 0));
    for (const { at, head } of verbs) {
      const i = starts.indexOf(at);
      const m = ms[i];
      if (!m || m.pos !== '動詞' || m.pos1 !== '自立' || !m.lemma || !KANA.test(m.lemma) || !spelledAs(head, m.lemma)) continue;
      // The second half of a compound is no use of the verb on its own: ふざけあう.
      if (ms[i - 1]?.pos !== '動詞') add(usual, m.lemma, head);
      const where = before(ms, i);
      if (where) add(after, `${m.lemma}\t${where}`, head);
    }
  }

  /** The commonest verb, how often, and of how many. */
  const top = (m: Map<string, number>): { verb: string; n: number; all: number } => {
    const [verb, n] = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
    return { verb, n, all: [...m.values()].reduce((a, b) => a + b, 0) };
  };
  /** The entry the dictionary opens for a kana verb on its own (rank()). */
  const opensAlone = (kana: string): Entry | undefined => rank(byForm.get(kana) ?? [], kana, { pos: '動詞,自立' })[0];
  /** Two spellings of one verb read as the kana is: 付く and 附く for つく. */
  const sameVerb = (a: string, b: string, kana: string): boolean =>
    a === b || (byForm.get(a) ?? []).some((e) => e.forms?.some((f) => f.text === b) && e.forms?.some((f) => f.kana && f.text === kana));
  const table = new Map<string, { usual?: string; after?: Record<string, string> }>();
  // What a verb most often is: the verb the index names most, at least five times and three times as often as the
  // entry opened today. Not for these, whose kana in Tatoeba are not what they are in speech: its による are no verbs to
  // the index, so its よる are 寄る; and its writers spell 帰る in kanji, so its かえる are 変える.
  const NO_DEFAULT = new Set(['よる', 'かえる']);
  for (const [kana, heads] of usual) {
    const { verb, n } = top(heads);
    const today = opensAlone(kana);
    const asToday = [...heads].filter(([h]) => today?.forms?.some((f) => f.text === h)).reduce((a, [, k]) => a + k, 0);
    if (NO_DEFAULT.has(kana) || n < 5 || n < 3 * Math.max(1, asToday) || today?.forms?.some((f) => f.text === verb)) continue;
    table.set(kana, { usual: verb });
  }
  // What it is after a noun and particle, seen at least twice and more often than all else, where that is another verb.
  for (const [key, verbs] of [...after].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [kana, at] = key.split('\t') as [string, string];
    const { verb, n, all } = top(verbs);
    if (all < 2 || n * 2 <= all) continue;
    const known = table.get(kana) ?? {};
    const otherwise = known.usual ?? opensAlone(kana)?.forms?.find((f) => !f.kana)?.text;
    if (otherwise && sameVerb(otherwise, verb, kana)) continue;
    table.set(kana, { ...known, after: { ...known.after, [at]: verb } });
  }

  const file = `${ROOT}src/dict/kana-verbs.ts`;
  const rows = [...table].sort((a, b) => a[0].localeCompare(b[0])).map(([kana, v]) => `  ${JSON.stringify(kana)}: ${JSON.stringify(v)},`);
  writeFileSync(file, `/**
 * Which verb in kanji a verb written in kana is, by what it follows in the line (followedVerbs() in
 * src/morphology/merge.ts): ひく after ピアノ|を is 弾く, たつ after 年| 経つ. After anything not listed, 'usual' is
 * what it most often is: つく 付く. Only where that is another verb than the dictionary opens for the kana on its
 * own. rank() in jmdict.ts weighs it after how the verb conjugates.
 *
 * Learned from Tatoeba (CC BY 2.0 FR): every verb written in kanji in its Japanese sentences, and every verb written
 * in kana that its word index names. Written by scripts/compare-unidic.mjs (VERBS=write${process.env.HALF ? ' HALF=1' : ''}): regenerate, never hand-edit.
 */
export const KANA_VERBS: Record<string, { usual?: string; after?: Record<string, string> }> = {
${rows.join('\n')}
};
`);
  const contexts = [...table.values()].reduce((n, v) => n + Object.keys(v.after ?? {}).length, 0);
  console.log(`${file}: ${table.size} verbs, ${[...table.values()].filter((v) => v.usual).length} with what they most often are, ${contexts} words before them`);
  process.exit(0);
}

// VERBS=1: verbs written in kana against the verb in kanji Tatoeba's word index names, by the entry each card opens
// first. VERBS=base saves the run as the one later runs are compared with; ODD=1 measures the sentences with odd ids.
if (process.env.VERBS) {
  const index = wordIndex();
  const named = new Map<string, string | undefined>();
  /** UniDic's name for a spelling, as nameOf() in offscreen.ts asks it. */
  const nameOf = (form: string): string | undefined => {
    if (!named.has(form)) {
      const found = both.unidic!(form);
      const name = found.length === 1 ? found[0]!.details[7]?.replace(/-.*$/, '') : undefined;
      named.set(form, name && name !== '*' ? name : undefined);
    }
    return named.get(form);
  };
  /** The entry a token's card opens first: its keys in turn, as lookupKeys() in src/dict/client.ts tries them. */
  const opens = (t: Token): Entry | undefined => {
    for (const k of t.lookup ?? []) {
      const found = byForm.get(k.key);
      if (!found?.length) continue;
      return rank(found, k.key, {
        reading: k.reading, pos: k.pos, ...(k.conj ? { conj: k.conj } : {}), ...(k.follows !== undefined ? { follows: k.follows } : {}),
        ...(k.spelling ? { spelling: k.spelling, names: nameOf } : {}),
      })[0];
    }
    return undefined;
  };
  // Each verb: where it stands, whether its card opens the index's verb, the word, the entry opened, the index's verb, the line.
  const each: Array<[at: string, right: string, word: string, opened: string, indexed: string, line: string]> = [];
  const sentences = tatoebaRows.filter(([id]) => index.has(id));
  for (const [id, text] of sentences) {
    const verbs = verbsIn(text, index.get(id)!);
    if (!verbs.length) continue;
    const tokens = (await segmentWith(text, via(readBoth))).tokens;
    for (const { at, head } of verbs) {
      const t = tokens.find((x) => x.start === at);
      if (!t?.lemma || t.pos !== '動詞' || !spelledAs(head, t.lemma)) continue;
      const entry = opens(t);
      const right = Boolean(entry?.forms?.some((f) => f.text === head));
      each.push([`${id}:${at}`, right ? '1' : '0', t.lemma, entry ? entry.kanji ?? entry.word : '-', head, text]);
    }
  }

  const counted = (m: Map<string, number>): string => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  const add = (m: Map<string, number>, k: string): void => void m.set(k, (m.get(k) ?? 0) + 1);
  // By verb: which entries its cards open, and which verbs the index names.
  const byVerb = new Map<string, { n: number; wrong: number; opens: Map<string, number>; names: Map<string, number> }>();
  for (const [, ok, lemma, opened, head] of each) {
    const v = byVerb.get(lemma) ?? { n: 0, wrong: 0, opens: new Map(), names: new Map() };
    byVerb.set(lemma, v);
    v.n++;
    if (ok === '0') v.wrong++;
    add(v.opens, opened);
    add(v.names, head);
  }
  const verbs = [...byVerb].filter(([, v]) => v.wrong).sort((a, b) => b[1].wrong - a[1].wrong)
    .map(([lemma, v]) => `${v.wrong} of ${v.n}\t${lemma}\topens ${counted(v.opens)}\tthe index: ${counted(v.names)}`);

  // Against the base: each verb whose card opens another entry now.
  const base = `${CACHE}/verbs-base.tsv`;
  const changes: Record<'right' | 'wrong' | 'other', Map<string, { n: number; eg: string }>> = { right: new Map(), wrong: new Map(), other: new Map() };
  const compared = process.env.VERBS !== 'base' && existsSync(base);
  if (compared) {
    const was = new Map(readFileSync(base, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')).map((r) => [r[0]!, r]));
    for (const [at, ok, lemma, opened, head, text] of each) {
      const then = was.get(at);
      if (!then || then[3] === opened) continue;
      const list = changes[then[1] === ok ? 'other' : ok === '1' ? 'right' : 'wrong'];
      const key = `${lemma}\t${then[3]} -> ${opened}\tthe index: ${head}`;
      const kind = list.get(key);
      if (kind) kind.n++;
      else list.set(key, { n: 1, eg: text });
    }
  }
  const total = (list: Map<string, { n: number }>): number => [...list.values()].reduce((n, k) => n + k.n, 0);
  const listed = (list: Map<string, { n: number; eg: string }>): string =>
    [...list].sort((x, y) => y[1].n - x[1].n).map(([k, v]) => `${v.n}\t${k}\t${v.eg}`).join('\n');

  const right = each.filter((r) => r[1] === '1').length;
  writeFileSync(process.env.VERBS === 'base' ? base : `${CACHE}/verbs.tsv`, each.map((r) => r.join('\t')).join('\n'));
  const out = `${CACHE}/verbs-report.txt`;
  writeFileSync(out, [
    ...(compared ? [
      `PUT RIGHT: ${total(changes.right)} verbs\n${listed(changes.right)}`,
      `PUT WRONG: ${total(changes.wrong)} verbs\n${listed(changes.wrong)}`,
      `ANOTHER ENTRY, NEITHER THE INDEX'S: ${total(changes.other)} verbs\n${listed(changes.other)}`,
    ] : []),
    `BY VERB: ${each.length - right} cards open another verb than the index's\n${verbs.join('\n')}`,
  ].join('\n\n'));
  console.log(`${each.length} verbs in kana that the index names in kanji, in ${sentences.length} sentences`);
  console.log(`the card opens the index's verb for ${right} (${(100 * right / each.length).toFixed(2)}%)`);
  if (compared) console.log(`against verbs-base.tsv: ${total(changes.right)} put right, ${total(changes.wrong)} put wrong, ${total(changes.other)} another wrong entry`);
  console.log(`by verb${compared ? ', and every change' : ''}: ${out}`);
  process.exit(0);
}

const subtitles: string[] = [];
for (const f of readdirSync(`${CACHE}/subs`).filter((n) => n.endsWith('.vtt'))) {
  for (const l of readFileSync(`${CACHE}/subs/${f}`, 'utf8').split('\n')) {
    const t = l.replace(/<[^>]+>/g, '').trim();
    if (t && t !== 'WEBVTT' && !t.includes('-->') && !/^(Kind|Language):/.test(t) && !/^\d+$/.test(t)) subtitles.push(t);
  }
}
const tatoeba = readFileSync(`${CACHE}/jpn.tsv`, 'utf8').split('\n').map((l) => l.split('\t')[2]).filter((s): s is string => Boolean(s));
const step = Math.max(1, Math.floor(tatoeba.length / SAMPLE));
const groups: Array<[string, string[]]> = [
  ['fixtures', Object.keys(FIXTURES)],
  ['subtitles', subtitles],
  ['tatoeba', process.env.FULL ? tatoeba : tatoeba.filter((_, i) => i % step === 0).slice(0, SAMPLE)],
];

// REREAD=1: IPADIC as it comes against IPADIC read again. FIRST=1: the line without the list of words IPADIC
// reads the rarer way, and with it. Otherwise IPADIC alone against IPADIC with UniDic.
const withoutList: Read = (text) => readJapanese(text, { ...both, firstReadings: undefined });
const [first, second]: [Read, Read] = process.env.REREAD ? [asItComes, readAlone]
  : process.env.FIRST ? [withoutList, readBoth] : [readAlone, readBoth];
const report: string[] = [];
for (const [name, lines] of groups) {
  let changed = 0;
  for (const text of lines) {
    // Most lines the two read alike. Over every sentence, only one read differently is merged both ways.
    const given = forAnalysis(text).text;
    if (process.env.FULL && words(first(given)) === words(second(given))) continue;
    const before = await line(text, first);
    const after = await line(text, second);
    if (before === after) continue;
    changed++;
    report.push(`[${name}] ${text}\n   before: ${before}\n   after:  ${after}`);
  }
  console.log(`${name}: ${lines.length} lines, ${changed} changed`);
}
const out = `${CACHE}/${process.env.REREAD ? 'reread' : process.env.FIRST ? 'first' : 'unidic'}-report.txt`;
writeFileSync(out, report.join('\n'));
console.log(`every changed line, before and after: ${out}`);
