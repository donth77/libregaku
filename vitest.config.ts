import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The TTML/VTT parsers use DOMParser, so they need a DOM.
    environment: 'happy-dom',
    // Contract tests hit live sites. They belong on a schedule, not on push.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.contract.test.ts'],
  },
});
