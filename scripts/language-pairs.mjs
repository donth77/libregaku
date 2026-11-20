#!/usr/bin/env node
/**
 * Write LANGUAGE-PAIRS.md from the code.
 *
 *   node scripts/language-pairs.mjs
 *
 * Builds scripts/language-pairs-page.ts with esbuild, as build.mjs builds the
 * extension, and writes what it returns. Run it whenever a language, a
 * dictionary or a dictionary site is added: a test fails until you do.
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}node_modules/.cache/libregaku-pairs/language-pairs.mjs`;
mkdirSync(new URL('../node_modules/.cache/libregaku-pairs/', import.meta.url), { recursive: true });
await build({
  entryPoints: [`${root}scripts/language-pairs-page.ts`],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  loader: { '.svg': 'text' },
  logLevel: 'error',
});
const { languagePairsPage } = await import(pathToFileURL(out).href);
const page = languagePairsPage();
writeFileSync(new URL('../LANGUAGE-PAIRS.md', import.meta.url), page);
console.log(`wrote LANGUAGE-PAIRS.md (${page.split('\n').length - 1} lines)`);
