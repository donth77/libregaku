#!/usr/bin/env node
/**
 * Measure a language read by its dictionary's forms on Tatoeba.
 *
 *   node scripts/measure-forms.mjs it
 *   SAVE=base node scripts/measure-forms.mjs it, then AGAINST=base node scripts/measure-forms.mjs it
 *
 * Builds scripts/measure-forms.ts with esbuild, as build.mjs builds the
 * extension, then runs it. See that file for what it measures and where.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}node_modules/.cache/libregaku-forms/measure-forms.mjs`;
mkdirSync(new URL('../node_modules/.cache/libregaku-forms/', import.meta.url), { recursive: true });
await build({
  entryPoints: [`${root}scripts/measure-forms.ts`],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: out,
  loader: { '.svg': 'text' },
  logLevel: 'error',
  // The script finds the repository from its own path; keep that the source's.
  define: { 'import.meta.url': JSON.stringify(new URL('./measure-forms.ts', import.meta.url).href) },
});
await import(pathToFileURL(out).href);
