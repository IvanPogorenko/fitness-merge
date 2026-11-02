import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Модульные тесты без базы данных (интеграционные — vitest.config.e2e.ts)
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    passWithNoTests: true,
  },
});
