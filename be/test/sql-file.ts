import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SqlStatement {
  label: string;
  sql: string;
}

// Разбирает sql/queries.sql на операторы: метка Q<n> для запросов и R<1а> для разборов
export function readQueriesFile(path = resolve(process.cwd(), '../sql/queries.sql')): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let label = '';
  let buffer: string[] = [];
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const query = /^-- QUERY (\d+):/.exec(line);
    const analysis = /^-- (\d[а-я])\. /.exec(line);
    if (query) label = `Q${query[1]}`;
    else if (analysis) label = `R${analysis[1]}`;
    if (line.startsWith('--') || line.trim() === '') continue;
    buffer.push(line);
    if (line.trimEnd().endsWith(';')) {
      statements.push({ label, sql: buffer.join('\n') });
      buffer = [];
    }
  }
  return statements;
}

export function statement(statements: SqlStatement[], label: string, index = 0): string {
  const found = statements.filter((s) => s.label === label)[index];
  if (!found) throw new Error(`Statement ${label}#${index} not found in sql/queries.sql`);
  return found.sql;
}
