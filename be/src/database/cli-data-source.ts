import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { cliDataSourceOptions } from './data-source-options.js';

config({ quiet: true });

// DataSource для CLI TypeORM (migration:run / migration:revert) и скриптов seed.
// synchronize выключен: схема меняется только миграциями.
export default new DataSource(cliDataSourceOptions());
