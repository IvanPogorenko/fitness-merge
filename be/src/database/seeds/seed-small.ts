import dataSource from '../cli-data-source.js';
import { seedSmall } from './small-dataset.js';
import { assertTrainingEnvironment, runInTransaction } from './seed-utils.js';

// Повторный запуск безопасен: набор пересоздается с нуля (TRUNCATE ... RESTART IDENTITY) в одной транзакции.
async function main(): Promise<void> {
  assertTrainingEnvironment();
  await dataSource.initialize();
  try {
    await runInTransaction(dataSource, seedSmall);
    console.log(`Small seed committed to ${dataSource.options.database}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Seed failed, transaction rolled back:', error);
  process.exitCode = 1;
});
