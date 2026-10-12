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
 *   WRITE=1 node scripts/compare-unidic.mjs         # write the parser fixtures again, as the extension now reads their lines
 *   WRITE=1 MORE='新しい行|もう一つ' node scripts/compare-unidic.mjs   # and add these lines to them
 *
 * Lines: the parser fixtures, any .vtt subtitle files in the cache's subs/
 * folder, and a spread of Tatoeba's Japanese sentences. Data is in
 * node_modules/.cache/libregaku-words: IPADIC, JMdict and Tatoeba from
 * compare-words (run that once first), UniDic downloaded here.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import init, {
  TokenizerBuilder, loadDictionaryFromBytes, loadUserDictionaryFromBytes, type Tokenizer,
} from 'lindera-wasm';
import { keysFor, rank, readingsOf, toEntry, type Entry, type RawWord } from '../src/dict/jmdict';
import { LINDERA_DICTS } from '../src/morphology/dictionaries';
import { analyserRows, extraCollector, misreads } from '../src/morphology/extra-words';
import { READINGS, fromIpadic, readJapanese, type Analysers, type Row } from '../src/morphology/japanese';
import { forAnalysis, segmentWith } from '../src/morphology/lindera';
import { lexiconQueries, type LexiconEntry, type Morpheme } from '../src/morphology/merge';
import { repair, type Reading } from '../src/morphology/repair';
import { fromUnidic } from '../src/morphology/unidic';
import { LINES as FIXTURES } from '../src/morphology/__tests__/fixtures/ipadic';

const ROOT = new URL('..', import.meta.url).pathname;
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
for (const w of raw.words) {
  const e = toEntry(w, 'eng');
  if (!e) continue;
  collect.add(e);
  for (const f of keysFor(w)) byForm.set(f, [...(byForm.get(f) ?? []), e]);
}
function lexicon(forms: string[]): Record<string, LexiconEntry[]> {
  const out: Record<string, LexiconEntry[]> = {};
  for (const form of new Set(forms)) {
    const ranked = rank(byForm.get(form) ?? [], form);
    const readings = readingsOf(ranked, form);
    if (!readings.length) continue;
    out[form] = readings.map((reading) => {
      const entry = ranked.find((e) => (e.reading ?? (e.uk ? e.word : undefined)) === reading);
      return { word: entry?.word ?? form, reading, pos: entry?.senses[0]?.pos };
    });
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

// The analysers as analyse() in offscreen.ts hands them to readJapanese(): IPADIC before anything else has
// loaded, IPADIC with the words JMdict adds, and that with UniDic.
const bare: Analysers = { ipadic: (text) => rows(plain.tokenize(text)) };
const alone: Analysers = { ipadic: (text) => rows(ipadic.tokenize(text)) };
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
    const mine = readAlone(text);
    if (same(mine, morphemes) || mine.map((m) => m.surface).join('') !== text) continue;
    const asked: Record<string, Reading[]> = {};
    const theirs = fromUnidic(both.unidic!(text));
    const again = repair(mine, theirs, (t, within) => {
      const readings = both.others!(t, within).map((r) => ({ words: r.rows.map((row) => fromIpadic(row.surface, row.details)), cost: r.cost }));
      asked[t] = readings;
      return readings;
    });
    if (!same(again, morphemes)) throw new Error(`${text}: repair() alone reads it differently from readJapanese()`);
    opinions.push(`  ${JSON.stringify(text)}: ${JSON.stringify({ ipadic: mine, unidic: theirs, others: asked })},`);
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
 * words, UniDic's in IPADIC's shape, and IPADIC's other readings of each run it was asked about.
 *
 * lindera-wasm 6.0.0 with lindera-ipadic-6.0.0 and lindera-unidic-6.0.0. Written by
 * scripts/compare-unidic.mjs (WRITE=1) with fixtures/ipadic.ts: regenerate rather than hand-edit.
 */
import type { Morpheme } from '../../merge';
import type { Reading } from '../../repair';

export const SECOND: Record<string, { ipadic: Morpheme[]; unidic: Morpheme[]; others: Record<string, Reading[]> }> = {
${opinions.join('\n')}
};
`);
  console.log(`${whole.length} lines written to ${main}: ${early.length} read differently by IPADIC alone, ${opinions.length} changed by UniDic (${second})`);
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

// REREAD=1: IPADIC as it comes against IPADIC read again. Otherwise IPADIC alone against IPADIC with UniDic.
const [first, second]: [Read, Read] = process.env.REREAD ? [asItComes, readAlone] : [readAlone, readBoth];
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
const out = `${CACHE}/${process.env.REREAD ? 'reread' : 'unidic'}-report.txt`;
writeFileSync(out, report.join('\n'));
console.log(`every changed line, before and after: ${out}`);
