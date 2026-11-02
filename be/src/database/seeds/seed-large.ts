import dataSource from '../cli-data-source.js';
import { LARGE_SEED, seedLarge } from './large-dataset.js';
import { assertTrainingEnvironment, runInTransaction } from './seed-utils.js';

// Пересоздает расширенный набор с нуля; после вставки обновляет статистику планировщика
async function main(): Promise<void> {
  assertTrainingEnvironment();
  
  await dataSource.initialize();
  
  try {
    const started = Date.now();
    await runInTransaction(dataSource, seedLarge);
    await dataSource.query('ANALYZE');
    const [counts] = await dataSource.query(`
      SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM channels) AS channels,
             (SELECT COUNT(*) FROM videos) AS videos, (SELECT COUNT(*) FROM video_tags) AS video_tags,
             (SELECT COUNT(*) FROM favorites) AS favorites, (SELECT COUNT(*) FROM playlist_items) AS playlist_items
    `);
    console.log(`Large seed (seed=${LARGE_SEED}) committed to ${dataSource.options.database} in ${Date.now() - started} ms`, counts);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Seed failed, transaction rolled back:', error);
  process.exitCode = 1;
});
