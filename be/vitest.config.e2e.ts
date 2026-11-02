import { config as loadEnv } from 'dotenv';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Интеграционные проверки на настоящем PostgreSQL в отдельной тестовой базе (DB_TEST_NAME).
const env = loadEnv({ quiet: true }).parsed ?? {};
const testDatabase = process.env.DB_TEST_NAME ?? env.DB_TEST_NAME ?? 'fitness_merge_test';

export default defineConfig({
  // SWC сохраняет метаданные декораторов (emitDecoratorMetadata), без них не работает DI Nest
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    env: { ...env, DB_NAME: testDatabase, NODE_ENV: 'test', DEMO_AUTH: 'true', DB_LOGGING: 'false' },
    // Один процесс и последовательные файлы: тесты делят одну базу
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
