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
  { entry: 'src/content/inject-disney.ts', out: 'inject-disney', format: 'iife' },
  { entry: 'src/content/inject-prime.ts', out: 'inject-prime', format: 'iife' },
  { entry: 'src/content/inject-max.ts', out: 'inject-max', format: 'iife' },
  { entry: 'src/offscreen.ts',       out: 'offscreen',       format: 'esm'  },
  { entry: 'src/options.ts',         out: 'options',         format: 'esm'  },
  { entry: 'src/action.ts',          out: 'action',          format: 'esm'  },
  { entry: 'src/help.ts',            out: 'help',            format: 'esm'  },
];

await mkdir(outdir, { recursive: true });

/*
 * Each language other than English is a file of its own, for the interface
 * (i18n/<code>.js) and for the help (i18n/help-<code>.js), loaded when it is
 * chosen: bundled in, twenty tables would be most of every page script. Each
 * file puts its words where src/i18n/index.ts and src/help/content.ts look.
 * The languages are the ones src/i18n/all.ts lists.
 */
const languages = [...(await readFile('src/i18n/all.ts', 'utf8')).matchAll(/^import \{ (\w+) \} from '\.\/([\w-]+)';$/gm)]
  .map(([, name, code]) => ({ name, code }));
const translations = languages.flatMap(({ name, code }) => [
  {
    out: `i18n/${code}`,
    stdin: `import { ${name} as words } from './src/i18n/${code}';\n` +
      `((globalThis.__libregaku ??= {}).strings ??= {})[${JSON.stringify(code)}] = words;\n`,
  },
  {
    out: `i18n/help-${code}`,
    stdin: `import { ${name} as help } from './src/help/${code}';\n` +
      `((globalThis.__libregaku ??= {}).help ??= {})[${JSON.stringify(code)}] = help;\n`,
  },
]);

// Static files.
await cp('src/manifest.json',  `${outdir}/manifest.json`);
await cp('src/offscreen.html', `${outdir}/offscreen.html`);
await cp('src/content/subs.css', `${outdir}/subs.css`);
await cp('src/options.html', `${outdir}/options.html`);
await cp('src/options.css', `${outdir}/options.css`);
await cp('src/help.html', `${outdir}/help.html`);
await cp('src/help.css', `${outdir}/help.css`);
await cp('src/page-header.css', `${outdir}/page-header.css`);
await cp('src/action.html', `${outdir}/action.html`);
await cp('src/action.css', `${outdir}/action.css`);
await cp('src/icons', `${outdir}/icons`, { recursive: true });
// _locales must sit beside the manifest for Chrome to find it.
await cp('src/_locales', `${outdir}/_locales`, { recursive: true });

// lindera ships the wasm binary beside its JS glue; the offscreen page loads
// it by extension URL, so it has to sit in dist/ as a real file.
// Its package exports map only exposes "." and "./opfs", so the .wasm cannot be
// resolved directly — resolve the entry point and take its sibling.
const linderaEntry = require.resolve('lindera-wasm');
const wasm = join(dirname(linderaEntry), 'lindera_wasm_bg.wasm');
await cp(wasm, `${outdir}/lindera_wasm_bg.wasm`);

const shared = {
  bundle: true,
  target: 'chrome120',
  platform: 'browser',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  logLevel: 'info',
};

const languageContexts = await Promise.all(translations.map((t) =>
  esbuild.context({
    ...shared,
    stdin: { contents: t.stdin, resolveDir: '.', loader: 'ts', sourcefile: `${t.out}.ts` },
    outfile: `${outdir}/${t.out}.js`,
    // A classic script: run into a tab's content-script world by the service
    // worker, or imported by an extension page for what it does.
    format: 'iife',
    logLevel: 'warning',
  })
));

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
    // The logo is imported from brand/ as markup (src/logo.ts).
    loader: { '.svg': 'text' },
    // Shown in settings, so a copy that has not been reloaded can be told apart.
    define: { __BUILT__: JSON.stringify(new Date().toISOString()) },
  })
));

contexts.push(...languageContexts);

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('libregaku: watching');
} else {
  await Promise.all(contexts.map(async (c) => { await c.rebuild(); await c.dispose(); }));
  console.log('libregaku: built -> dist/');
}
