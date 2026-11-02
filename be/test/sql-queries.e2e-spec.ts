import type { Client } from 'pg';
import { rawClient, resetSmallSeed, testDataSource } from './db.js';
import { runSqlCases } from './sql-runner.js';

// Этап 5: 12 запросов и два разбора из sql/queries.sql против ожиданий, выписанных вручную
describe('SQL-запросы на малом наборе', () => {
  let client: Client;

  beforeAll(async () => {
    const dataSource = testDataSource();
    await dataSource.initialize();
    await resetSmallSeed(dataSource);
    await dataSource.destroy();
    client = await rawClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('каждый запрос дает ожидаемый ответ', async () => {
    const results = await runSqlCases(client);
    const failed = results.filter((r) => !r.ok).map((r) => ({ case: `${r.testCase.label} ${r.testCase.title}`, actual: r.actual, affected: r.affected }));
    expect(failed).toEqual([]);
    expect(new Set(results.filter((r) => r.testCase.label.startsWith('Q')).map((r) => r.testCase.label)).size).toBe(12);
  });
});
