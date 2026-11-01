#!/usr/bin/env node
/**
 * What adding one adverb to the analyser, at one score or several, does to real sentences.
 *
 *   node scripts/measure-word.mjs たまに タマニ 3000 4000 5000
 *   SHOW=40 TRY='そのたまに当たった|ここにはたまに来る' node scripts/measure-word.mjs たまに タマニ 4000
 *
 * For each score: how many of Tatoeba's sentences with the word in them are
 * read differently, how many then have it as the adverb, some of the changed
 * ones (SHOW, 6 by default) to read, and how each line in TRY comes out. A score
 * is right when every changed line reads right and the lines that mean
 * something else stay as they were. The scores in SPOKEN_ADVERBS
 * (src/morphology/extra-words.ts) were set this way.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import init, { TokenizerBuilder, loadDictionaryFromBytes, loadUserDictionaryFromBytes } from 'lindera-wasm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = `${ROOT}node_modules/.cache/libregaku-words`;
if (!existsSync(`${CACHE}/jpn.tsv`)) {
  console.error('No data yet: run `node scripts/compare-words.mjs` once, which downloads IPADIC, JMdict and Tatoeba.');
  process.exit(1);
}
await init({ module_or_path: readFileSync(`${ROOT}node_modules/lindera-wasm/lindera_wasm_bg.wasm`) });
const D = `${CACHE}/ipadic/${readdirSync(`${CACHE}/ipadic`)[0]}`;
const file = (n) => new Uint8Array(readFileSync(`${D}/${n}`));
const dictionary = () => loadDictionaryFromBytes(
  file('metadata.json'), file('dict.trie'), file('dict.valsidx'), file('dict.vals'),
  file('dict.wordsidx'), file('dict.words'), file('matrix.mtx'), file('char_def.bin'), file('unk.bin'),
);
const sentences = readFileSync(`${CACHE}/jpn.tsv`, 'utf8').split('\n').map((l) => l.split('\t')[2]).filter(Boolean);

const [word, reading, ...costs] = process.argv.slice(2);
if (!word || !reading || !costs.length) {
  console.error('usage: node scripts/measure-word.mjs <word> <reading in katakana> <score> [score…]');
  process.exit(1);
}
/** IPADIC's context id for a plain adverb (副詞,一般). */
const ADVERB = 1281;
const plain = new TokenizerBuilder().setDictionaryInstance(dictionary()).setMode('normal').build();
const cut = (tk, s) => tk.tokenize(s).map((x) => `${x.surface}/${x.details?.[0]}`).join(' ');
const with_ = sentences.filter((s) => s.includes(word));
const lines = (process.env.TRY ?? '').split('|').filter(Boolean);
const show = Number(process.env.SHOW ?? 6);
for (const cost of costs) {
  const d = dictionary();
  const row = [word, ADVERB, ADVERB, cost, '副詞', '一般', '*', '*', '*', '*', word, reading, reading].join(',');
  const user = loadUserDictionaryFromBytes(new TextEncoder().encode(row), d.metadata);
  const tk = new TokenizerBuilder().setDictionaryInstance(d).setUserDictionaryInstance(user).setMode('normal').build();
  let changed = 0;
  let adverb = 0;
  const samples = [];
  for (const s of with_) {
    const before = cut(plain, s);
    const after = cut(tk, s);
    if (after.includes(`${word}/副詞`)) adverb++;
    if (before === after) continue;
    changed++;
    if (samples.length < show) samples.push(after);
  }
  console.log(`score ${cost}: ${with_.length} sentences, ${changed} read differently, ${adverb} with ${word} as an adverb`);
  for (const s of samples) console.log(`    ${s.replace(/\/[^ ]*/g, '')}`);
  for (const s of lines) console.log(`  ${s} -> ${cut(tk, s).replace(/\/[^ ]*/g, '')}`);
}
