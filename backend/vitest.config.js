import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.js'],
    setupFiles: ['./tests/setup-env.js'],
    // One shared seeded database: run files one at a time.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
