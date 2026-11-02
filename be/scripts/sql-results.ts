// Фактические результаты sql/queries.sql на малом наборе и сравнение с ручными ожиданиями (этап 5).
// Пересоздает малый набор в базе DB_NAME! Запуск: npm run docs:sql
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import dataSource from '../src/database/cli-data-source.js';
import { seedSmall } from '../src/database/seeds/small-dataset.js';
import { assertTrainingEnvironment, runInTransaction } from '../src/database/seeds/seed-utils.js';
import { runSqlCases } from '../test/sql-runner.js';

const table = (columns: string[], rows: unknown[][]) =>
  rows.length === 0 ? '_пусто_' : [`| ${columns.join(' | ')} |`, `|${columns.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

async function main(): Promise<void> {
  assertTrainingEnvironment();
  await dataSource.initialize();
  await runInTransaction(dataSource, seedSmall);
  await dataSource.destroy();

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    const results = await runSqlCases(client);
    const out = [
      '# Результаты SQL на малом наборе',
      '',
      `Сгенерировано \`npm run docs:sql\` на свежем \`seed:small\`, ${new Date().toISOString().slice(0, 10)}. Ожидания выписаны вручную из определения seed (\`be/test/sql-expectations.ts\`), фактический ответ — выполнение \`sql/queries.sql\`. Совпало: ${results.filter((r) => r.ok).length} из ${results.length}.`,
      '',
    ];
    for (const r of results) {
      const { testCase } = r;
      out.push(`## ${testCase.label} — ${testCase.title} ${r.ok ? '✅' : '❌'}`, '');
      out.push(`Параметры: \`${JSON.stringify(testCase.params)}\``, '');
      if (testCase.affected !== undefined) {
        out.push(`Ожидалось строк изменено: ${testCase.affected}; фактически: ${r.affected}`, '');
        continue;
      }
      if (JSON.stringify(r.actual) === JSON.stringify(testCase.expected.map((row) => row.map(String)))) {
        out.push('Ожидание = факт:', '', table(testCase.columns, r.actual), '');
      } else {
        out.push('Ожидание:', '', table(testCase.columns, testCase.expected), '', 'Факт:', '', table(testCase.columns, r.actual), '');
      }
    }
    writeFileSync(resolve(process.cwd(), '../docs/sql-results.md'), out.join('\n'));
    console.log(`${results.filter((r) => r.ok).length}/${results.length} match, written docs/sql-results.md`);
    if (results.some((r) => !r.ok)) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
