import { QueryFailedError } from 'typeorm';

// Коды SQLSTATE PostgreSQL, которые приложение различает явно
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
  LOCK_NOT_AVAILABLE: '55P03',
  QUERY_CANCELED: '57014',
} as const;

export interface PgErrorInfo {
  code?: string;
  constraint?: string;
}

// Решения принимаются по коду и имени ограничения, а не по тексту сообщения
export function pgErrorInfo(error: unknown): PgErrorInfo | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const driverError = error.driverError as { code?: string; constraint?: string };
  return { code: driverError.code, constraint: driverError.constraint };
}

export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  const info = pgErrorInfo(error);
  return info?.code === code && (constraint === undefined || info.constraint === constraint);
}
