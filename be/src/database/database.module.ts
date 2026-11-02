import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { connectionOptions } from './data-source-options.js';
import { ENTITIES } from './entities/index.js';
import { SqlStatsLogger } from './sql-stats.logger.js';

// Один экземпляр логгера на приложение: его же получает TypeORM и тесты, считающие SQL
@Global()
@Module({
  providers: [
    {
      provide: SqlStatsLogger,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new SqlStatsLogger(config.get<string>('DB_LOGGING') === 'true'),
    },
  ],
  exports: [SqlStatsLogger],
})
export class SqlStatsModule {}

// Один DataSource (и один пул pg) на процесс. TypeORM закрывает пул при остановке приложения.
@Module({
  imports: [
    SqlStatsModule,
    TypeOrmModule.forRootAsync({
      imports: [SqlStatsModule],
      inject: [ConfigService, SqlStatsLogger],
      useFactory: (config: ConfigService, sqlStats: SqlStatsLogger) => ({
        ...connectionOptions({
          DB_HOST: config.get<string>('DB_HOST'),
          DB_PORT: config.get<string>('DB_PORT'),
          DB_USER: config.get<string>('DB_USER'),
          DB_PASSWORD: config.get<string>('DB_PASSWORD'),
          DB_NAME: config.get<string>('DB_NAME'),
        }),
        entities: ENTITIES,
        synchronize: false,
        migrationsRun: false,
        logger: sqlStats,
        logging: true,
        maxQueryExecutionTime: 1000,
        extra: {
          // Конечный пул: 4 соединения на процесс (бюджет см. README)
          max: Number(config.get<string>('DB_POOL_MAX') ?? 4),
          // Ожидание свободного клиента пула
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          // Выполнение одной SQL-команды и ожидание блокировки — отдельные лимиты PostgreSQL
          statement_timeout: 10000,
          lock_timeout: 5000,
          idle_in_transaction_session_timeout: 15000,
          application_name: 'videohost-api',
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
