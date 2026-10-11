#!/usr/bin/env node
/**
 * Write src/morphology/__tests__/fixtures/ko-dic.ts: what the analyser
 * returns for the lines the Korean merge tests stand on.
 *
 *   node scripts/build-ko-fixture.mjs <ko-dic directory>
 *   node scripts/build-ko-fixture.mjs <ko-dic directory> <lines file> <fixture to write>
 *
 * The tests in src/morphology/__tests__/merge-ko.test.ts assert on what
 * ko-dic really gives back, misreadings included, so the fixture is made by
 * running the analyser and never by hand. This runs the lindera-wasm the
 * extension ships (node_modules) over each line of
 * scripts/ko-fixture-lines.txt, and keeps of each row what the offscreen
 * document keeps (READERS['ko-dic'] in src/offscreen.ts): the surface, the
 * tag, the type and the expression, with ko-dic's "*" left out.
 *
 * <ko-dic directory> is the dictionary the extension downloads, unpacked —
 * the archive LINDERA_DICTS['ko-dic'] names in src/morphology/dictionaries.ts,
 * with metadata.json, dict.trie and the rest in it. It is 80 MB, so it is not
 * in the repository: run this with no directory to be told where it is.
 *
 * Run it when a line is added to the list, and when lindera or ko-dic is
 * bumped — and then read the diff, because a row that changed is a rule in
 * src/morphology/merge-ko.ts to look at again. The same lines and the same
 * dictionary always write the same file.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const [dir, lines = `${ROOT}scripts/ko-fixture-lines.txt`, out = `${ROOT}src/morphology/__tests__/fixtures/ko-dic.ts`] =
  process.argv.slice(2);

// The dictionary the extension is pinned to, by the name of its archive: lindera-ko-dic-6.0.0.
const pinned = /'ko-dic': '([^']+\/(lindera-ko-dic-[^/']+)\.zip)'/.exec(
  readFileSync(`${ROOT}src/morphology/dictionaries.ts`, 'utf8'),
);
if (!pinned) throw new Error('src/morphology/dictionaries.ts names no ko-dic archive');
const [, url, dictionary] = pinned;

if (!dir || !existsSync(`${dir}/metadata.json`)) {
  console.error(`
  build-ko-fixture — the analyser's rows for the Korean merge tests

    node scripts/build-ko-fixture.mjs <ko-dic directory> [<lines file> [<fixture to write>]]

  <ko-dic directory> holds ${dictionary} unpacked (metadata.json, dict.trie, …):

    curl -LO ${url}
    unzip ${dictionary}.zip
    node scripts/build-ko-fixture.mjs lindera-ko-dic
`);
  process.exit(1);
}

// The analyser as the offscreen document builds it (buildTokenizer in src/offscreen.ts).
const wasm = `${ROOT}node_modules/lindera-wasm`;
const lindera = await import(pathToFileURL(`${wasm}/lindera_wasm.js`).href);
await lindera.default({ module_or_path: readFileSync(`${wasm}/lindera_wasm_bg.wasm`) });
const file = (name) => new Uint8Array(readFileSync(`${dir}/${name}`));
const builder = new lindera.TokenizerBuilder();
builder.setDictionaryInstance(lindera.loadDictionaryFromBytes(
  file('metadata.json'), file('dict.trie'), file('dict.valsidx'), file('dict.vals'), file('dict.wordsidx'),
  file('dict.words'), file('matrix.mtx'), file('char_def.bin'), file('unk.bin'),
));
builder.setMode('normal');
const tokenizer = builder.build();

// One line of the list is one line of the fixture. A # opens a comment, and \uXXXX stands for a character that
// cannot be seen, in the list as in the fixture.
const texts = [...new Set(
  readFileSync(lines, 'utf8').split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))),
)];

const given = (value) => (value && value !== '*' ? value : undefined);
const visible = (json) =>
  json.replace(/[\u00a0\u200b-\u200f\u2028-\u202f\u2060\u3000\ufeff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const rows = texts.map((text) => {
  const morphemes = tokenizer.tokenize(text).map((row) => {
    const d = row.details ?? [];
    const morpheme = { surface: row.surface };
    for (const [key, value] of [['tag', given(d[0])], ['type', given(d[4])], ['expression', given(d[7])]]) {
      if (value) morpheme[key] = value;
    }
    return morpheme;
  });
  return `  ${visible(JSON.stringify(text))}: ${visible(JSON.stringify(morphemes))},`;
});

const version = JSON.parse(readFileSync(`${wasm}/package.json`, 'utf8')).version;
writeFileSync(out, `/**
 * Real analyser output, for the Korean merge tests.
 *
 * lindera-wasm ${version} with ${dictionary}, mode "normal", each row read
 * as the offscreen analyser reads it: surface, and from the details the tag
 * (0), the type (4) and the expression (7), with ko-dic's "*" left out.
 * These are sequences ko-dic actually produces, misreadings included — a line
 * with no full stop is read differently from the same line with one, and
 * both are here.
 *
 * Written by a script, never by hand. To add a line or to rebuild after
 * lindera or ko-dic is bumped, edit scripts/ko-fixture-lines.txt and run
 *
 *   node scripts/build-ko-fixture.mjs <ko-dic directory>
 *
 * which says where the dictionary comes from when run with no directory.
 */
import type { KoMorpheme } from '../../merge-ko';

export const LINES: Record<string, KoMorpheme[]> = {
${rows.join('\n')}
};
`);
console.log(`${texts.length} lines → ${out}`);
