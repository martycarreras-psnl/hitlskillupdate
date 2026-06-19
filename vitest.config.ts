import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    // The @microsoft/power-apps SDK ships ESM with extensionless internal imports
    // that Node/vitest can't resolve from node_modules without transforming it.
    // Inlining lets Vite's resolver process it so the real provider's import chain
    // loads under jsdom (tests still run on the mock provider).
    server: {
      deps: {
        inline: ['@microsoft/power-apps'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/generated/**', 'src/mockData/**', 'src/**/*.test.*'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
