import { config as loadEnv } from 'dotenv';
import { deployFromScratch, testDataSource } from './db.js';

// Один раз перед всеми файлами: тестовая база пересоздается миграциями и малым seed
export default async function setup(): Promise<void> {
  loadEnv({ quiet: true });
  const dataSource = testDataSource(process.env.DB_TEST_NAME ?? 'fitness_merge_test');
  await dataSource.initialize();
  try {
    await deployFromScratch(dataSource);
  } finally {
    await dataSource.destroy();
  }
}
