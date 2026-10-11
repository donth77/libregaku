import { readFileSync } from 'node:fs';
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
  },
});
