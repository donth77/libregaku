#!/usr/bin/env node
/**
 * Compare IPADIC with and without JMdict's added words, line by line.
 *
 *   node scripts/compare-words.mjs
 *   SAMPLE=5000 COST=9000 node scripts/compare-words.mjs
 *
 * Builds scripts/compare-words.ts with esbuild, as build.mjs builds the
 * extension, then runs it. See that file for what it compares and where.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}node_modules/.cache/libregaku-words/compare-words.mjs`;
mkdirSync(new URL('../node_modules/.cache/libregaku-words/', import.meta.url), { recursive: true });
await build({
  entryPoints: [`${root}scripts/compare-words.ts`],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'error',
  // The script finds the repository from its own path; keep that the source's.
  define: { 'import.meta.url': JSON.stringify(new URL('./compare-words.ts', import.meta.url).href) },
});
await import(pathToFileURL(out).href);
