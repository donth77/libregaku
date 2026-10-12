#!/usr/bin/env node
/**
 * Compare UniDic with IPADIC over the parser fixtures, line by line.
 *
 *   node scripts/compare-unidic.mjs
 *   SHOW=待ちそうだ node scripts/compare-unidic.mjs
 *
 * Builds scripts/compare-unidic.ts with esbuild, as build.mjs builds the
 * extension, then runs it. See that file for what it compares and where.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = `${root}node_modules/.cache/libregaku-words/compare-unidic.mjs`;
mkdirSync(new URL('../node_modules/.cache/libregaku-words/', import.meta.url), { recursive: true });
await build({
  entryPoints: [`${root}scripts/compare-unidic.ts`],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  logLevel: 'error',
  // The script finds the repository from its own path; keep that the source's.
  define: { 'import.meta.url': JSON.stringify(new URL('./compare-unidic.ts', import.meta.url).href) },
});
await import(out);
