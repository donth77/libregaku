import { defineConfig } from 'vitest/config';

/** Canaries against the live sites. Slow, networked, and allowed to be flaky. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/contract/**/*.contract.test.ts'],
    testTimeout: 30_000,
    retry: 2, // a transient network blip is not a broken assumption
  },
});
