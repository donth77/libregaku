#!/usr/bin/env node
/**
 * Words the analyser reads as one word alone and cuts apart in sentences.
 *
 *   node scripts/audit-cuts.mjs
 *
 * Takes JMdict's common adverbs, conjunctions, expressions and particles of
 * two to six kana that IPADIC reads whole on their own, finds them in
 * Tatoeba's sentences, and lists the ones it cuts there into pieces with a
 * content word among them: たまに into たま, a ball, and に. Most cuts are
 * right — 歌うことになりました is こと and に — so this is a list to read, not
 * a list of faults: the ones to look at are those whose pieces mean something
 * else. Each line: the word, cuts out of occurrences, how it was cut, and a
 * sentence.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import init, { TokenizerBuilder, loadDictionaryFromBytes } from 'lindera-wasm';

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

const tk = new TokenizerBuilder().setDictionaryInstance(dictionary()).setMode('normal').build();
const cut = (text) => tk.tokenize(text).map((t) => ({ s: t.surface, pos: t.details?.[0], pos1: t.details?.[1] }));

const json = readdirSync(CACHE).find((f) => /^jmdict-eng.*\.json$/.test(f));
const words = JSON.parse(readFileSync(`${CACHE}/${json}`, 'utf8')).words;
const KANA = /^[ぁ-ゖー]{2,6}$/;
const WANT = new Set(['adv', 'adv-to', 'conj', 'exp', 'prt', 'int', 'n-adv', 'aux', 'cop', 'adj-pn']);
const CONTENT = new Set(['名詞', '動詞', '形容詞', '副詞', '連体詞']);
const candidates = new Set();
for (const w of words) {
  if (!w.sense.some((s) => s.partOfSpeech.some((p) => WANT.has(p)))) continue;
  for (const k of w.kana) if (k.common && KANA.test(k.text)) candidates.add(k.text);
}
const whole = [...candidates].filter((text) => cut(text).length === 1);
console.log(`${candidates.size} common words, ${whole.length} read whole alone`);

const sample = sentences.filter((_, i) => i % 3 === 0);
const rows = [];
for (const text of whole) {
  const hits = sample.filter((s) => s.includes(text)).slice(0, 80);
  let cuts = 0;
  let found = 0;
  const how = new Map();
  let example = '';
  for (const s of hits) {
    const toks = cut(s);
    const bounds = [0];
    for (const t of toks) bounds.push(bounds[bounds.length - 1] + t.s.length);
    for (let i = s.indexOf(text); i >= 0; i = s.indexOf(text, i + 1)) {
      const end = i + text.length;
      if (!bounds.includes(i) || !bounds.includes(end)) continue;   // inside a longer word
      found++;
      const inside = toks.filter((_, k) => bounds[k] >= i && bounds[k + 1] <= end);
      if (inside.length < 2 || !inside.some((t) => CONTENT.has(t.pos))) continue;
      cuts++;
      const key = inside.map((t) => t.s).join(' + ');
      how.set(key, (how.get(key) ?? 0) + 1);
      example ||= s;
    }
  }
  if (found >= 4 && cuts / found >= 0.25) rows.push({ text, cuts, found, how: [...how].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '', example });
}
rows.sort((a, b) => b.cuts - a.cuts);
for (const r of rows) console.log(`${r.text}\t${r.cuts}/${r.found}\t${r.how}\t${r.example}`);
