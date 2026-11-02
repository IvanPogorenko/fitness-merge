import { Logger as NestLogger } from '@nestjs/common';
import type { Logger as TypeOrmLogger, LogLevel, LogMessage, QueryRunner } from 'typeorm';

// Логгер TypeORM, который считает реально отправленные в PostgreSQL команды.
// Нужен для проверки N+1: число SQL на один HTTP-запрос должно быть фиксированным.
export class SqlStatsLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('SQL');
  private executed: string[] = [];

  constructor(private readonly printQueries = false) {}

  get count(): number {
    return this.executed.length;
  }

  get queries(): readonly string[] {
    return this.executed;
  }

  reset(): void {
    this.executed = [];
  }

  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    this.executed.push(query);
    if (this.printQueries) {
      this.logger.debug(`${query}${parameters?.length ? ` -- ${JSON.stringify(parameters)}` : ''}`);
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]): void {
    // Ожидаемые нарушения ограничений превращаются в 4xx выше по стеку; здесь только диагностика
    this.logger.debug(`Query failed: ${error instanceof Error ? error.message : error} -- ${query} ${JSON.stringify(parameters ?? [])}`);
  }

  logQuerySlow(time: number, query: string): void {
    this.logger.warn(`Slow query (${time} ms): ${query}`);
  }

  logSchemaBuild(message: string): void {
    this.logger.debug(message);
  }

  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') this.logger.warn(String(message));
  }

  logMessage?(message: string | number | LogMessage | (string | number | LogMessage)[], level?: LogLevel): void {
    void message;
    void level;
  }
}
