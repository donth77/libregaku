/**
 * IPADIC alone against IPADIC with JMdict's added words (src/morphology/
 * extra-words.ts), line by line, through the extension's own segmenting steps.
 *
 * Run it before changing what goes into the list, how it is scored, or the
 * dictionaries it comes from. Every line whose words change is written out,
 * before and after, to be read: the list should only ever put misreadings
 * right. Run with scripts/compare-words.mjs, which builds this first.
 *
 * Lines: the parser fixtures, a spread of Tatoeba's Japanese sentences, and
 * any .vtt subtitle files put in the cache's subs/ folder. Data is downloaded
 * on the first run into node_modules/.cache/libregaku-words.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import init, {
  TokenizerBuilder, loadDictionaryFromBytes, loadUserDictionaryFromBytes, type Tokenizer,
} from 'lindera-wasm';
import { jmdictUrl } from '../src/dict/store';
import { keysFor, toEntry, wordsFor, type Entry, type RawWord } from '../src/dict/jmdict';
import { EXTRA_COST, analyserRows, extraCollector, misreads } from '../src/morphology/extra-words';
import { LINDERA_DICTS } from '../src/morphology/dictionaries';
import { segmentWith } from '../src/morphology/lindera';
import { lexiconQueries, type LexiconEntry, type Morpheme } from '../src/morphology/merge';
import { LINES as FIXTURES } from '../src/morphology/__tests__/fixtures/ipadic';

const ROOT = new URL('..', import.meta.url).pathname;
const CACHE = `${ROOT}node_modules/.cache/libregaku-words`;
const COST = Number(process.env.COST ?? EXTRA_COST);
const SAMPLE = Number(process.env.SAMPLE ?? 20000);
const TATOEBA = 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2';

function fetchOnce(url: string, file: string, unpack: (path: string) => void): void {
  const path = `${CACHE}/${file}`;
  if (existsSync(`${path}.done`)) return;
  console.log(`downloading ${url}`);
  execFileSync('curl', ['-sSL', '-o', path, url]);
  unpack(path);
  writeFileSync(`${path}.done`, '');
}
mkdirSync(`${CACHE}/subs`, { recursive: true });
fetchOnce(LINDERA_DICTS.ipadic!, 'ipadic.zip', (p) => execFileSync('unzip', ['-o', '-q', p, '-d', `${CACHE}/ipadic`]));
fetchOnce(jmdictUrl('eng'), 'jmdict.tgz', (p) => execFileSync('tar', ['-xzf', p, '-C', CACHE]));
fetchOnce(TATOEBA, 'jpn.tsv.bz2', (p) => execFileSync('bzip2', ['-dkf', p]));

await init({ module_or_path: readFileSync(`${ROOT}node_modules/lindera-wasm/lindera_wasm_bg.wasm`) });
const D = `${CACHE}/ipadic/${readdirSync(`${CACHE}/ipadic`)[0]}`;
const file = (n: string): Uint8Array => new Uint8Array(readFileSync(`${D}/${n}`));
const dictionary = () => loadDictionaryFromBytes(
  file('metadata.json'), file('dict.trie'), file('dict.valsidx'), file('dict.vals'),
  file('dict.wordsidx'), file('dict.words'), file('matrix.mtx'), file('char_def.bin'), file('unk.bin'),
);

// The analyser as the offscreen document reads it (analyse() there).
const L = { pos: 0, pos1: 1, conjForm: 5, base: 6, reading: 7 };
type Raw = { surface: string; details?: string[] };
const col = (d: string[], i: number): string | undefined => (d[i] && d[i] !== '*' ? d[i] : undefined);
function morphemes(t: Tokenizer, text: string): Morpheme[] {
  return (t.tokenize(text) as Raw[]).map((x) => {
    const d = x.details ?? [];
    const usable = d.length > L.reading;
    return {
      surface: x.surface,
      lemma: usable ? col(d, L.base) : undefined,
      reading: usable ? col(d, L.reading) : undefined,
      pos: col(d, L.pos), pos1: col(d, L.pos1), conjForm: col(d, L.conjForm),
    };
  });
}

// JMdict in memory, answering as the store does (lexicon() there).
const json = readdirSync(CACHE).find((f) => /^jmdict-eng.*\.json$/.test(f));
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
    const words = wordsFor(byForm.get(form) ?? [], form);
    if (words.length) out[form] = words;
  }
  return out;
}
const analyser = (t: Tokenizer) => async (text: string) => {
  const tokens = morphemes(t, text);
  return { ok: true, tokens, lexicon: lexicon(lexiconQueries(tokens)), complete: true };
};

// The list, built as the offscreen document builds it.
const plain = new TokenizerBuilder().setDictionaryInstance(dictionary()).setMode('normal').build();
const words = collect.words().filter((w) =>
  misreads(w, (plain.tokenize(w.surface) as Raw[]).map((t) => ({ surface: t.surface, reading: col(t.details ?? [], L.reading) }))));
const rows = analyserRows(words, COST);
const dict2 = dictionary();
const user = loadUserDictionaryFromBytes(new TextEncoder().encode(rows), dict2.metadata);
const added = new TokenizerBuilder().setDictionaryInstance(dict2).setUserDictionaryInstance(user).setMode('normal').build();
console.log(`${words.length} words added, scored ${COST}`);

const subtitles: string[] = [];
for (const f of readdirSync(`${CACHE}/subs`).filter((n) => n.endsWith('.vtt'))) {
  for (const line of readFileSync(`${CACHE}/subs/${f}`, 'utf8').split('\n')) {
    const t = line.replace(/<[^>]+>/g, '').trim();
    if (t && t !== 'WEBVTT' && !t.includes('-->') && !/^(Kind|Language):/.test(t) && !/^\d+$/.test(t)) subtitles.push(t);
  }
}
const tatoeba = readFileSync(`${CACHE}/jpn.tsv`, 'utf8').split('\n').map((l) => l.split('\t')[2]).filter((s): s is string => Boolean(s));
const step = Math.max(1, Math.floor(tatoeba.length / SAMPLE));
const groups: Array<[string, string[]]> = [
  ['fixtures', Object.keys(FIXTURES)],
  ['subtitles', subtitles],
  ['tatoeba', tatoeba.filter((_, i) => i % step === 0).slice(0, SAMPLE)],
];

const show = (t: { surface: string; lemma?: string; reading?: string; content: boolean }): string =>
  t.content ? `${t.surface}${t.lemma && t.lemma !== t.surface ? `→${t.lemma}` : ''}${t.reading ? `(${t.reading})` : ''}` : t.surface;
const report: string[] = [];
for (const [name, lines] of groups) {
  let changed = 0;
  for (const line of lines) {
    const before = (await segmentWith(line, analyser(plain))).tokens.map(show).join(' ');
    const after = (await segmentWith(line, analyser(added))).tokens.map(show).join(' ');
    if (before === after) continue;
    changed++;
    report.push(`[${name}] ${line}\n   before: ${before}\n   after:  ${after}`);
  }
  console.log(`${name}: ${lines.length} lines, ${changed} changed`);
}
const out = `${CACHE}/report-${COST}.txt`;
writeFileSync(out, report.join('\n'));
console.log(`every changed line, before and after: ${out}`);
