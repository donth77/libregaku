#!/usr/bin/env node
/**
 * Write src/dict/zh-traditional.ts: the traditional form of each simplified
 * Chinese character that has one and only one.
 *
 *   node scripts/build-zh-traditional.mjs
 *   CEDICT=cedict.txt.gz UNIHAN_VARIANTS=Unihan_Variants.txt node scripts/build-zh-traditional.mjs
 *
 * A learner who reads traditional characters (zh-Hant) is given Chinese
 * Wiktionary's meanings, which are mostly written in simplified ones
 * (toTraditional in src/dict/traditional.ts). Most simplified characters are
 * one traditional character wherever they stand: 说 is 說, 们 們. Some are two
 * or three, and which depends on the word: 发 is 發 in 发现 and 髮 in 头发, 后
 * 後 in 以后 and itself in 皇后. Only a word list can say which, and those are
 * left as they are written: a character table cannot be right about them.
 *
 * CC-CEDICT writes every word in both forms. Each of its 120,000 words with as
 * many characters in each form pairs each simplified character with the
 * traditional one in its place. A character is written here where one
 * traditional form stands for it in at least SHARE of the words it is in, that
 * form is not the character itself, and Unihan's kTraditionalVariant names it
 * too. Below SHARE it depends on the word.
 *
 * Run it when CC-CEDICT or Unihan is bumped, as build-zh-readings.mjs is, from
 * the same files, kept in node_modules/.cache/libregaku-zh; or read from the
 * paths in CEDICT (the text, gzipped or not) and UNIHAN_VARIANTS
 * (Unihan_Variants.txt). The same inputs always write the same file.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = `${ROOT}node_modules/.cache/libregaku-zh`;
const OUT = `${ROOT}src/dict/zh-traditional.ts`;
const UNIHAN = 'https://www.unicode.org/Public/16.0.0/ucd/Unihan.zip';
const CEDICT = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

/**
 * How many of the words a character is in its one traditional form must stand
 * in: all but one in twenty. 别 is 別 in 172 of CC-CEDICT's words with it and 彆
 * in four (别扭, 彆扭), and is 別. 于 is 於 in 183 and itself in 15 (the surname
 * Yú), 92%, and stays as it is written; so do 后, 後 in 373 and itself in 31, and
 * 游, 遊 in 167 and itself in 55 (游泳).
 */
const SHARE = 0.95;

/** Characters packed as three base-36 digits each: every code point up to this, the whole of the CJK blocks of the BMP. */
const PACKABLE = 36 ** 3 - 1;

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
let variantsPath = process.env.UNIHAN_VARIANTS;
if (!variantsPath) {
  const zip = fetchOnce(UNIHAN, 'Unihan.zip');
  variantsPath = `${CACHE}/Unihan_Variants.txt`;
  if (!existsSync(variantsPath)) execFileSync('unzip', ['-o', '-q', zip, 'Unihan_Variants.txt', '-d', CACHE]);
}

// CC-CEDICT: "傳說 传说 [chuan2 shuo1] /legend/...". Each word with as many characters in both forms.
const packedFile = readFileSync(cedictPath);
const cedict = (packedFile[0] === 0x1f && packedFile[1] === 0x8b ? gunzipSync(packedFile) : packedFile).toString('utf8');
const LINE = /^(\S+) (\S+) \[/;
const forms = new Map(); // simplified character → traditional character → words
let words = 0;
for (const line of cedict.split('\n')) {
  const [, traditional, simplified] = LINE.exec(line) ?? [];
  if (!traditional || !simplified) continue;
  const t = [...traditional];
  const s = [...simplified];
  if (t.length !== s.length) continue;
  words++;
  s.forEach((char, i) => {
    if (!forms.has(char)) forms.set(char, new Map());
    const to = forms.get(char);
    to.set(t[i], (to.get(t[i]) ?? 0) + 1);
  });
}
if (words < 100000) throw new Error(`${cedictPath} holds ${words} words in both forms: not CC-CEDICT, or not all of it`);

// Unihan_Variants.txt: U+53D1 <tab> kTraditionalVariant <tab> U+767C U+9AEE.
const unihan = readFileSync(variantsPath, 'utf8');
const variants = new Map();
const charOf = (code) => String.fromCodePoint(parseInt(code.slice(2), 16));
for (const line of unihan.split(/\r?\n/)) {
  const [code, field, value] = line.split('\t');
  if (field !== 'kTraditionalVariant' || !code?.startsWith('U+') || !value) continue;
  variants.set(charOf(code), value.trim().split(/\s+/).map((v) => charOf(v.split('<')[0])));
}
if (variants.size < 2000) throw new Error(`${variantsPath} holds ${variants.size} kTraditionalVariant fields: not Unihan_Variants.txt`);

const table = new Map();
let several = 0;
let unpackable = 0;
for (const [char, to] of forms) {
  const total = [...to.values()].reduce((a, b) => a + b, 0);
  const [best, n] = [...to].sort((a, b) => b[1] - a[1] || a[0].codePointAt(0) - b[0].codePointAt(0))[0];
  if (best === char && n === total) continue;
  if (best === char || n / total < SHARE || !variants.get(char)?.includes(best)) {
    several++;
    continue;
  }
  if (char.codePointAt(0) > PACKABLE || best.codePointAt(0) > PACKABLE) {
    unpackable++;
    continue;
  }
  table.set(char, best);
}

// What the written file's own comments say of it. A table that disagrees was made from the wrong files.
for (const [char, traditional] of [['说', '說'], ['们', '們'], ['见', '見'], ['访', '訪'], ['别', '別']]) {
  if (table.get(char) !== traditional) throw new Error(`${char} came out ${table.get(char)}, not ${traditional}`);
}
for (const char of ['发', '后', '于', '干', '台', '面', '游']) {
  if (table.has(char)) throw new Error(`${char} came out ${table.get(char)}: its traditional form depends on the word`);
}

const digits = (char) => char.codePointAt(0).toString(36).padStart(3, '0');
const pairs = [...table].sort(([a], [b]) => a.codePointAt(0) - b.codePointAt(0)).map(([s, t]) => digits(s) + digits(t));
const lines = [];
for (let i = 0; i < pairs.length; i += 16) lines.push(pairs.slice(i, i + 16).join(''));

const fromHeader = (text, re, what, path) => {
  const found = re.exec(text.slice(0, 4000));
  if (!found?.[1]) throw new Error(`${path}: no ${what} in its header`);
  return found[1].trim();
};
const unicode = fromHeader(unihan, /^# Unicode Version (.+)$/m, 'version', variantsPath);
const unicodeDate = fromHeader(unihan, /^# Date: (\d{4}-\d{2}-\d{2})/m, 'date', variantsPath);
const copyright = fromHeader(unihan, /^# (©.+)$/m, 'copyright line', variantsPath);
const terms = fromHeader(unihan, /^# (For terms of use.+)$/m, 'terms of use', variantsPath);
const cedictDate = fromHeader(cedict, /^#! date=(\d{4}-\d{2}-\d{2})/m, 'date', cedictPath);
const count = (n) => n.toLocaleString('en-US');

writeFileSync(OUT, `/*
 * GENERATED by scripts/build-zh-traditional.mjs — do not edit. Change the script,
 * or the data it reads, and run it again.
 *
 * From:
 *   CC-CEDICT of ${cedictDate}, ${count(words)} words written alike in both forms — CC BY-SA 4.0, https://cc-cedict.org
 *   Unihan_Variants.txt, field kTraditionalVariant — Unicode ${unicode}, ${unicodeDate}
 *     ${copyright} ${terms}
 */

/**
 * ${count(table.size)} simplified characters, each followed by its traditional form, as
 * two code points of three base-36 digits: "${digits('说')}${digits('說')}" is 说 (U+8BF4) and 說 (U+8AAA).
 * Digits because the build writes its bundles in ASCII, where a Chinese
 * character costs six bytes and a digit one.
 */
const PACKED = \`
${lines.join('\n')}
\`;

function unpack(packed: string): Map<string, string> {
  const out = new Map<string, string>();
  const digits = packed.replace(/\\s+/g, '');
  const at = (i: number): string => String.fromCodePoint(parseInt(digits.slice(i, i + 3), 36));
  for (let i = 0; i + 6 <= digits.length; i += 6) out.set(at(i), at(i + 3));
  return out;
}

/**
 * The traditional form of each simplified character that has one wherever it
 * stands: 说 說, 们 們, 见 見. Not the ${count(several)} whose form depends on the word
 * (发 發 or 髮, 后 後 or 后), nor ${count(unpackable)} outside the BMP's CJK blocks.
 */
export const TRADITIONAL: ReadonlyMap<string, string> = /* @__PURE__ */ unpack(PACKED);
`);

console.log(
  `${forms.size} simplified characters in ${words} words: ${table.size} written, ${several} left because their traditional ` +
    `form depends on the word, ${unpackable} outside the packed range`,
);
console.log(`${OUT.slice(ROOT.length)}: ${readFileSync(OUT).length} bytes`);
