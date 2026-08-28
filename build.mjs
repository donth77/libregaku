import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const watch = process.argv.includes('--watch');
const outdir = 'dist';

// Content scripts must be classic scripts -> iife.
// The offscreen document is a real extension page -> esm, so lindera's
// wasm-bindgen glue and its dynamic wasm import survive bundling.
const targets = [
  { entry: 'src/background.ts',      out: 'background',      format: 'iife' },
  { entry: 'src/content/index.ts',   out: 'content',         format: 'iife' },
  { entry: 'src/content/inject.ts',  out: 'inject',          format: 'iife' },
  { entry: 'src/content/inject-netflix.ts', out: 'inject-netflix', format: 'iife' },
  { entry: 'src/offscreen.ts',       out: 'offscreen',       format: 'esm'  },
  { entry: 'src/options.ts',         out: 'options',         format: 'esm'  },
];

await mkdir(outdir, { recursive: true });

// Static files.
await cp('src/manifest.json',  `${outdir}/manifest.json`);
await cp('src/offscreen.html', `${outdir}/offscreen.html`);
await cp('src/content/subs.css', `${outdir}/subs.css`);
await cp('src/options.html', `${outdir}/options.html`);
await cp('src/options.css', `${outdir}/options.css`);
// _locales must sit beside the manifest for Chrome to find it.
await cp('src/_locales', `${outdir}/_locales`, { recursive: true });

// lindera ships the wasm binary beside its JS glue; the offscreen page loads
// it by extension URL, so it has to sit in dist/ as a real file.
// Its package exports map only exposes "." and "./opfs", so the .wasm cannot be
// resolved directly — resolve the entry point and take its sibling.
const linderaEntry = require.resolve('lindera-wasm');
const wasm = join(dirname(linderaEntry), 'lindera_wasm_bg.wasm');
await cp(wasm, `${outdir}/lindera_wasm_bg.wasm`);

const contexts = await Promise.all(targets.map((t) =>
  esbuild.context({
    entryPoints: [t.entry],
    outfile: `${outdir}/${t.out}.js`,
    bundle: true,
    format: t.format,
    target: 'chrome120',
    platform: 'browser',
    sourcemap: watch ? 'inline' : false,
    minify: !watch,
    logLevel: 'info',
    // Never inline the wasm; it is fetched at runtime by URL.
    external: ['*.wasm'],
  })
));

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('libregaku: watching');
} else {
  await Promise.all(contexts.map(async (c) => { await c.rebuild(); await c.dispose(); }));
  console.log('libregaku: built -> dist/');
}
