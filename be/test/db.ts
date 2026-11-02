import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { cliDataSourceOptions, connectionOptions, MIGRATIONS } from '../src/database/data-source-options.js';
import { seedSmall } from '../src/database/seeds/small-dataset.js';
import { runInTransaction } from '../src/database/seeds/seed-utils.js';

// Защита от запуска разрушающих проверок не на учебной базе
export function assertDisposableDatabase(name: string | undefined): string {
  if (!name || !/_(test|scratch)$/.test(name)) {
    throw new Error(`Refusing to wipe database "${name}": only *_test or *_scratch databases are allowed`);
  }
  return name;
}

export function testDataSource(database = process.env.DB_NAME): DataSource {
  return new DataSource(cliDataSourceOptions({ ...process.env, DB_NAME: assertDisposableDatabase(database) }));
}

// Развертывание с нуля: пустая схема, все миграции, малый seed — без ручного SQL
export async function deployFromScratch(dataSource: DataSource): Promise<string[]> {
  assertDisposableDatabase(String(dataSource.options.database));
  await dataSource.query('DROP SCHEMA public CASCADE');
  await dataSource.query('CREATE SCHEMA public');
  const applied = await dataSource.runMigrations({ transaction: 'each' });
  await resetSmallSeed(dataSource);
  return applied.map((m) => m.name);
}

export function resetSmallSeed(dataSource: DataSource): Promise<void> {
  return runInTransaction(dataSource, seedSmall);
}

// Отдельное «сырое» соединение pg для проверок блокировок двумя сессиями
export async function rawClient(): Promise<Client> {
  const options = connectionOptions(process.env);
  const client = new Client({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: options.database,
    // Ограниченные ожидания: проверка гонки не должна зависнуть
    lock_timeout: 5000,
    statement_timeout: 10000,
  });
  await client.connect();
  return client;
}

export const MIGRATION_COUNT = MIGRATIONS.length;
