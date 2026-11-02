import type { DataSourceOptions } from 'typeorm';
import { CreateTables1700000000000 } from './migration/17000-CreateTable.js';
import { CreateVideoContentTables1700000000001 } from './migration/170001-CreateVideoContTable.js';
import { CreateUserInterationTables1700000000002 } from './migration/170002-CreateUserInteracionTables.js';
import { HardenConstraints1700000000003 } from './migration/170003-HardenConstraints.js';
import { AddVideoCommentsEnabled1700000000004 } from './migration/170004-AddVideoCommentsEnabled.js';
import { AddQueryIndexes1700000000005 } from './migration/170005-AddQueryIndexes.js';

// Миграции перечислены явно: так один список работает в CLI, в собранном приложении и в тестах
export const MIGRATIONS = [
  CreateTables1700000000000,
  CreateVideoContentTables1700000000001,
  CreateUserInterationTables1700000000002,
  HardenConstraints1700000000003,
  AddVideoCommentsEnabled1700000000004,
  AddQueryIndexes1700000000005,
];

export type Env = Record<string, string | undefined>;

export function connectionOptions(env: Env = process.env) {
  return {
    type: 'postgres' as const,
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5433),
    username: env.DB_USER ?? 'videohost',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'fitness_merge_dev',
  };
}

// Опции для CLI миграций и скриптов seed: без сущностей, только миграции
export function cliDataSourceOptions(env: Env = process.env): DataSourceOptions {
  return {
    ...connectionOptions(env),
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    synchronize: false,
    // Скрипту хватает одного-двух соединений
    extra: { max: 2 },
  };
}
