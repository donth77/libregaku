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
import { keysFor, toEntry, wordsFor, type Entry, type RawWord } from '../src/dict/jmdict';
import { LINDERA_DICTS } from '../src/morphology/dictionaries';
import {
  analyserRows, extraCollector, firstReadingCollector, firstReadingsBy, firstReadingsKept, misreads, type AnalysedPiece, type FirstReading,
} from '../src/morphology/extra-words';
import { IPADIC, READINGS, fromIpadic, readJapanese, withFirstReadings, type Analysers, type Row } from '../src/morphology/japanese';
import { forAnalysis, segmentWith } from '../src/morphology/lindera';
import { lexiconQueries, type LexiconEntry, type Morpheme } from '../src/morphology/merge';
import { repair, type Reading } from '../src/morphology/repair';
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

// READINGS=1: words in kanji against the readings in Tatoeba's word index, with UniDic's reading of a word and without.
if (process.env.READINGS) {
  if (!existsSync(`${CACHE}/jpn_indices.done`)) {
    const from = 'https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2';
    console.log(`downloading ${from}`);
    execFileSync('curl', ['-sSL', '-o', `${CACHE}/jpn_indices.tar.bz2`, from]);
    execFileSync('tar', ['-xjf', `${CACHE}/jpn_indices.tar.bz2`, '-C', CACHE, 'jpn_indices.csv']);
    writeFileSync(`${CACHE}/jpn_indices.done`, '');
  }
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

  // The index: sentence id, meaning id, and each word as head(reading)[sense]{as written}~.
  const index = new Map<string, string>();
  for (const l of readFileSync(`${CACHE}/jpn_indices.csv`, 'utf8').split('\n')) {
    const [id, , text] = l.split('\t');
    if (id && text) index.set(id, text);
  }
  const HAN = /[\u4E00-\u9FFF\u3400-\u4DBF々]/u;
  const WORD = /^([^(\[{~|]+)(?:\|\d+)?(?:\(([^)]*)\))?(?:\[\d+\])*(?:\{([^}]*)\})?~?$/u;
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
