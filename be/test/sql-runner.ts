import type { Client } from 'pg';
import { SQL_CASES, type SqlCase } from './sql-expectations.js';
import { readQueriesFile, statement } from './sql-file.js';

export interface SqlCaseResult {
  testCase: SqlCase;
  sql: string;
  actual: string[][];
  affected: number | null;
  ok: boolean;
}

const cell = (value: unknown): string => (value instanceof Date ? value.toISOString() : String(value));

// Выполняет все запросы из sql/queries.sql на текущем состоянии базы (ожидается свежий малый seed)
export async function runSqlCases(client: Client): Promise<SqlCaseResult[]> {
  const statements = readQueriesFile();
  const results: SqlCaseResult[] = [];
  for (const testCase of SQL_CASES) {
    const sql = statement(statements, testCase.label, testCase.index ?? 0);
    const res = await client.query(sql, testCase.params);
    const actual = res.rows.map((row) => testCase.columns.map((column) => cell(row[column])));
    const expected = testCase.expected.map((row) => row.map(cell));
    const ok = testCase.affected !== undefined ? res.rowCount === testCase.affected : JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ testCase, sql, actual, affected: res.rowCount, ok });
  }
  return results;
}
