// Идентификаторы и байты хранятся как bigint и передаются в JSON десятичной строкой.
export const MAX_BIGINT = 9223372036854775807n;
const POSITIVE_DECIMAL = /^[1-9][0-9]{0,18}$/;

export function isPositiveBigintString(value: unknown): value is string {
  return typeof value === 'string' && POSITIVE_DECIMAL.test(value) && BigInt(value) <= MAX_BIGINT;
}

// Безопасное целое number приводится к строке; все остальное остается как есть и не пройдет проверку
export function toBigintString(value: unknown): unknown {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return value;
}
