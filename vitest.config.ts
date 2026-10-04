import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // A few tests drive real per-pixel image loops over 600x600 buffers. They
    // pass comfortably in isolation but exceed the 5s default when the suite
    // runs many workers on a loaded machine. Per-test timeouts stay tight
    // elsewhere; only the genuinely heavy image tests override it.
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
