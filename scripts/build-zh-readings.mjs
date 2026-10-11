#!/usr/bin/env node
/**
 * Write src/dict/zh-readings.ts: the usual reading of each Chinese character
 * that CC-CEDICT reads more than one way.
 *
 *   node scripts/build-zh-readings.mjs
 *   CEDICT=cedict.txt.gz UNIHAN=Unihan_Readings.txt node scripts/build-zh-readings.mjs
 *
 * About 1,250 single characters have two or more readings in CC-CEDICT — 了 is
 * le, liǎo or liào — and the file does not say which is the usual one.
 * Unicode's Unihan database does: its kMandarin field is "the most customary
 * pinyin reading" of a character. This takes that reading for every such
 * character, under each of its forms, wherever it is one CC-CEDICT lists too,
 * and leaves the rest to the ranking's other steps (rank() in
 * src/dict/cedict.ts).
 *
 * Run it when CC-CEDICT or Unihan is bumped, or EXCEPTIONS changes. The same
 * inputs always write the same file. Both are downloaded on the first run into
 * node_modules/.cache/libregaku-zh — delete that to fetch CC-CEDICT again, as
 * its publisher has only a "current" file — or read from the paths in CEDICT
 * (the text, gzipped or not) and UNIHAN (Unihan_Readings.txt).
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const CACHE = `${ROOT}node_modules/.cache/libregaku-zh`;
const OUT = `${ROOT}src/dict/zh-readings.ts`;
const UNIHAN = 'https://www.unicode.org/Public/16.0.0/ucd/Unihan.zip';
const CEDICT = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

/**
 * Characters whose customary reading is not how they read as a word on their
 * own.
 *
 * kMandarin is a character's reading wherever it appears, inside longer words
 * included: 教 is jiào because of 教育, 教室 and 教授. This table is only ever
 * asked about a character standing alone, which is what the word splitter
 * leaves when it is a word by itself, and there 教 is jiāo, "to teach".
 *
 * Measured on that: the splitter's own words for 44,590 Tatoeba sentences
 * (367,356 words). Every character with several readings that stood alone
 * nine times or more was looked at, and the doubtful ones read sentence by
 * sentence — all of them, or for the commonest every third, fourth or fifth,
 * which the line then calls a sample. One is listed when it read the other
 * way at least three times in four. Commonest first.
 *
 * Keep it short. A rarer character is better left to Unihan than tuned by
 * hand; so is one that reads both ways about as often (干, 倒, 觉, 系, 落), and
 * one whose count is a single phrase over and over (柏, twelve times in
 * thirteen the 柏 of 柏柏語, Berber).
 */
const EXCEPTIONS = {
  // The mark of having done a thing, 去过 and 见过: 157 of a sample of 192, of 765, both forms. Unihan's guò, "to cross", 35.
  过: 'guo',
  過: 'guo',
  // The particle after a verb, 说得好 and 跑得快: 108 of a sample of 133, of 663. Unihan's dé, "to get", 14; děi, "must", 11.
  得: 'de',
  // Traditional writing's 着, the particle of 看著 and 帶著: 109 of a sample of 113, of 337. Unihan's zhù, "to write", none.
  著: 'zhe',
  // The first half of 甚麼, "what", which the splitter's dictionary lacks and cuts in two: 179 of 185. Unihan's shèn, "very", 6.
  甚: 'shén',
  // "Long", 很长 and 多长时间: 111 of 145, both forms. Unihan's zhǎng, "to grow; chief", 34.
  长: 'cháng',
  長: 'cháng',
  // "To stay", 待在家里 and 待了三天: 104 of 109. Unihan's dài, "to treat; to wait for", is the one in 等待 and 对待.
  待: 'dāi',
  // "To teach", 他教英语: 88 of 93. Unihan's jiào is the one in 教育 and 教室.
  教: 'jiāo',
  // "To play" an instrument, 弹钢琴, and "to bounce": 69 of 70, both forms. Unihan's dàn, "bullet", is the one in 子弹.
  弹: 'tán',
  彈: 'tán',
  // "You", to a woman, as Taiwan writes it: 54 of 54. Unihan's nǎi is an old way of writing 奶.
  妳: 'nǐ',
  // Taiwan's particle at the end of a sentence, 好可愛喔: 41 of 49. Unihan's ō is the "oh" that begins one.
  喔: 'o',
  // The r on the end of a word, 一会儿 and 门儿, left by itself when the splitter lacks the word: 21 of 27, both forms.
  儿: 'r',
  兒: 'r',
  // "To cut", 切菜 and 切蛋糕: 21 of 24. Unihan's qiè is the one in 一切 and 亲切.
  切: 'qiē',
  // "Buddha": 12 of 12. Unihan's fú is the one in 仿佛.
  佛: 'fó',
  // "Wow!", at the start of a sentence: 11 of 12. Unihan's wa is 啊 after a u.
  哇: 'wā',
  // "To do all one can", 尽全力 and 尽了最大努力: 11 of 11. Unihan's jǐn is the one in 尽管 and 尽快.
  尽: 'jìn',
  // "Dirty", 脏衣服 and 脏了: 9 of 9. Unihan's zàng, "organ", is the one in 心脏.
  脏: 'zāng',
  // "Dry", which only traditional writing spells this way, 乾毛巾: 9 of 9. Unihan's first reading, qián, is the trigram's.
  乾: 'gān',
};

function fetchOnce(url, file, unpack) {
  const path = `${CACHE}/${file}`;
  if (existsSync(`${path}.done`)) return path;
  console.log(`downloading ${url}`);
  execFileSync('curl', ['-fsSL', '-o', path, url]);
  unpack?.(path);
  writeFileSync(`${path}.done`, '');
  return path;
}
mkdirSync(CACHE, { recursive: true });
const cedictPath = process.env.CEDICT ?? fetchOnce(CEDICT, 'cedict.txt.gz');
const unihanPath = process.env.UNIHAN ?? (
  fetchOnce(UNIHAN, 'Unihan.zip', (p) => execFileSync('unzip', ['-o', '-q', p, 'Unihan_Readings.txt', '-d', CACHE])),
  `${CACHE}/Unihan_Readings.txt`
);

// The extension's own reading of the file, so the table holds readings exactly
// as the store will: bundled from src/dict, as build.mjs bundles the extension.
// The table itself is left out of that bundle — it is what this writes, and
// may not exist yet.
const bundle = `${CACHE}/cedict.mjs`;
await build({
  stdin: { contents: "export * from './src/dict/cedict'; export * from './src/dict/pinyin';", resolveDir: ROOT, loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  logLevel: 'error',
  plugins: [{
    name: 'no-table',
    setup(b) {
      b.onResolve({ filter: /\/zh-readings$/ }, (a) => ({ path: a.path, namespace: 'no-table' }));
      b.onLoad({ filter: /.*/, namespace: 'no-table' }, () => ({ contents: 'export const DEFAULT_READINGS = {};' }));
    },
  }],
});
const { parseLine, toEntry, keysFor, foldPinyin } = await import(pathToFileURL(bundle).href);

// Every reading CC-CEDICT gives each single character, under either form, and
// beside each the file's own numbered spelling of it.
const packedFile = readFileSync(cedictPath);
const cedict = (packedFile[0] === 0x1f && packedFile[1] === 0x8b ? gunzipSync(packedFile) : packedFile).toString('utf8');
const readings = new Map();
let entries = 0;
for (const line of cedict.split('\n')) {
  const row = parseLine(line);
  if (!row) continue;
  entries++;
  const reading = toEntry(row, '').reading;
  if (!reading) continue;
  for (const key of keysFor(row)) {
    if ([...key].length !== 1) continue;
    if (!readings.has(key)) readings.set(key, new Map());
    // Folded, so that 中 the surname, Zhōng, is no second reading of 中.
    readings.get(key).set(foldPinyin(reading), row.pinyin.toLowerCase());
  }
}
if (entries < 100000) throw new Error(`${cedictPath} holds ${entries} entries: not CC-CEDICT, or not all of it`);

// Unihan_Readings.txt: U+4E86 <tab> kMandarin <tab> le. Where there are two
// values, the first is the reading preferred on the mainland and the second
// the one preferred in Taiwan.
const unihan = readFileSync(unihanPath, 'utf8');
const customary = new Map();
for (const line of unihan.split('\n')) {
  const [code, field, value] = line.split('\t');
  if (field !== 'kMandarin' || !code?.startsWith('U+') || !value) continue;
  customary.set(String.fromCodePoint(parseInt(code.slice(2), 16)), value.trim().split(/\s+/).map(foldPinyin));
}
if (customary.size < 10000) throw new Error(`${unihanPath} holds ${customary.size} kMandarin readings: not Unihan_Readings.txt`);

// Unihan's reading of a character, of those CC-CEDICT lists (`has`): the
// mainland's, as CC-CEDICT's own readings are the mainland's, else Taiwan's
// (嗯 is ǹg in Unihan, which CC-CEDICT has no entry for, then en).
const fromUnihan = (char, has) => customary.get(char)?.find((r) => has.has(r));

for (const [char, reading] of Object.entries(EXCEPTIONS)) {
  const has = readings.get(char);
  if (!has?.has(reading)) {
    const listed = [...(has?.keys() ?? [])].join(', ') || 'no entry';
    throw new Error(`EXCEPTIONS: CC-CEDICT does not read ${char} as ${reading} (it has ${listed})`);
  }
  if (has.size < 2) throw new Error(`EXCEPTIONS: ${char} has one reading in CC-CEDICT, and needs no entry`);
  if (fromUnihan(char, has) === reading) throw new Error(`EXCEPTIONS: ${char} is ${reading} from Unihan already`);
}

const table = new Map();
let several = 0;
let unlisted = 0;
let unknown = 0;
for (const [char, has] of readings) {
  if (has.size < 2) continue;
  several++;
  const reading = EXCEPTIONS[char] ?? fromUnihan(char, has);
  if (reading) table.set(char, reading);
  else if (customary.has(char)) unlisted++;
  else unknown++;
}

// What the written file's own comments say of it. A table that disagrees was
// made from the wrong files, or by a reading of them that has gone wrong.
for (const [char, reading] of [['了', 'le'], ['的', 'de'], ['还', 'hái'], ['還', 'hái'], ['长', 'cháng']]) {
  if (table.get(char) !== reading) throw new Error(`${char} came out ${table.get(char)}, not ${reading}`);
}

// Written as "reading, then every character read that way", the reading
// numbered as the file numbers it: build.mjs writes bundles in ASCII, where a
// tone mark costs six bytes and a digit one.
const groups = new Map();
for (const [char, reading] of table) {
  const numbered = readings.get(char).get(reading);
  if (!/^(?:[a-z:]+[1-5])+$/.test(numbered) || foldPinyin(numbered) !== reading) {
    throw new Error(`cannot pack ${char} ${reading}: the file writes it ${numbered}`);
  }
  if (!groups.has(numbered)) groups.set(numbered, []);
  groups.get(numbered).push(char);
}
const packed = [...groups]
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([reading, chars]) => reading + chars.sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join(''));

const lines = [];
let line = '';
for (const group of packed) {
  if (line && [...line].length + [...group].length + 1 > 96) {
    lines.push(line);
    line = '';
  }
  line += (line ? ' ' : '') + group;
}
if (line) lines.push(line);

const fromHeader = (text, re, what, path) => {
  const found = re.exec(text.slice(0, 4000));
  if (!found?.[1]) throw new Error(`${path}: no ${what} in its header`);
  return found[1].trim();
};
const unicode = fromHeader(unihan, /^# Unicode Version (.+)$/m, 'version', unihanPath);
const unicodeDate = fromHeader(unihan, /^# Date: (\d{4}-\d{2}-\d{2})/m, 'date', unihanPath);
const copyright = fromHeader(unihan, /^# (©.+)$/m, 'copyright line', unihanPath);
const terms = fromHeader(unihan, /^# (For terms of use.+)$/m, 'terms of use', unihanPath);
const cedictDate = fromHeader(cedict, /^#! date=(\d{4}-\d{2}-\d{2})/m, 'date', cedictPath);
const count = (n) => n.toLocaleString('en-US');

writeFileSync(OUT, `/*
 * GENERATED by scripts/build-zh-readings.mjs — do not edit. Change the script,
 * or the data it reads, and run it again.
 *
 * From:
 *   Unihan_Readings.txt, field kMandarin — Unicode ${unicode}, ${unicodeDate}
 *     ${copyright} ${terms}
 *   CC-CEDICT of ${cedictDate}, ${count(entries)} entries — CC BY-SA 4.0, https://cc-cedict.org
 *   ${Object.keys(EXCEPTIONS).length} exceptions, each with its reason, in the script
 */
import { toneMarks } from './pinyin';

/**
 * ${count(table.size)} characters, each after the reading it usually has: "hai2还還" is 还 and
 * 還, both hái. Numbered, as CC-CEDICT numbers readings, because the build
 * writes its bundles in ASCII, where a tone mark costs six bytes and a digit
 * one.
 */
const PACKED = \`
${lines.join('\n')}
\`;

function unpack(packed: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const group of packed.trim().split(/\\s+/)) {
    const [, reading = '', chars = ''] = /^((?:[a-z:]+[1-5])+)(.+)$/u.exec(group) ?? [];
    for (const char of chars) out[char] = toneMarks(reading);
  }
  return out;
}

/**
 * The usual reading of a character that CC-CEDICT reads more than one way: 了
 * le, 的 de, 还 hái, 长 cháng. Lower case, with tone marks, as the entries'
 * own readings are written.
 *
 * Every such character is here under each of its forms, simplified and
 * traditional, unless Unihan has no reading for it or none CC-CEDICT lists —
 * ${count(several - table.size)} of ${count(several)}, which fall to the ranking's other steps.
 */
export const DEFAULT_READINGS: Record<string, string> = /* @__PURE__ */ unpack(PACKED);
`);

console.log(
  `${several} characters with several readings: ${table.size} written, ${Object.keys(EXCEPTIONS).length} of them exceptions; ` +
    `${unlisted} left out because CC-CEDICT lists none of Unihan's readings, ${unknown} because Unihan has none`,
);
console.log(`${OUT.slice(ROOT.length)}: ${readFileSync(OUT).length} bytes`);
