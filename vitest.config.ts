import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // build.mjs loads .svg as text (src/logo.ts imports the logo from
      // brand/); Vite would hand over a URL instead, so do what the build does.
      name: 'svg-as-text',
      enforce: 'pre',
      load(id) {
        const path = id.split('?')[0]!;
        return path.endsWith('.svg') ? `export default ${JSON.stringify(readFileSync(path, 'utf8'))};` : null;
      },
    },
  ],
  test: {
    // The TTML/VTT parsers use DOMParser, so they need a DOM.
    environment: 'happy-dom',
    // Every translation, which the extension loads one at a time.
    setupFiles: ['src/__tests__/setup.ts'],
    // Contract tests hit live sites. They belong on a schedule, not on push.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.contract.test.ts'],
    // Every worker asks the one transform server for its modules. With a worker per core on a 32-core
    // machine it answered too slowly: the tests that import a module inside the test (the content
    // script, the offscreen document) timed out waiting, in most runs. 16 workers passed every run, as
    // fast. Below 17 cores this is the default; CI has two.
    maxWorkers: Math.max(1, Math.min(16, availableParallelism() - 1)),
  },
});
