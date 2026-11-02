import { BadRequestException } from '@nestjs/common';
import { isPositiveBigintString } from '../common/bigint.js';

// Курсор каталога — обе части ключа сортировки последней строки: (published_at, id).
// published_at хранится как timestamptz(3), поэтому ISO-строка с миллисекундами передает его точно.
export interface CatalogCursor {
  publishedAt: string;
  id: string;
}

const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function encodeCursor(cursor: CatalogCursor): string {
  return Buffer.from(JSON.stringify([cursor.publishedAt, cursor.id]), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): CatalogCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === 'string' && ISO_MS.test(parsed[0]) && isPositiveBigintString(parsed[1])) {
      return { publishedAt: parsed[0], id: parsed[1] };
    }
  } catch {
    // ниже — единый ответ для любого повреждения курсора
  }
  throw new BadRequestException('Invalid cursor');
}
