// Планы выполнения на расширенном seed (этап 8). Запуск: npm run perf:explain -- <метка>
// Для каждого запроса: 2 прогрева + 5 измерений EXPLAIN (ANALYZE, BUFFERS) с одинаковыми параметрами.
// Сохраняется план последнего повтора и статистика Execution Time по всем пяти.
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

config({ quiet: true });

const label = process.argv[2] ?? 'run';
const WARMUP = 2;
const REPEATS = 5;

// Тексты совпадают по смыслу с запросами API/ sql/queries.sql: одинаковые WHERE, ORDER BY и размер страницы
const EXPERIMENTS: Array<{ name: string; sql: string; params: (db: Client) => Promise<unknown[]> }> = [
  {
    name: 'catalog-first-page',
    sql: `SELECT v.id, v.title, v.published_at, c.title AS channel_title, u.display_name AS author_name
            FROM videos v
            JOIN channels c ON c.id = v.channel_id
            JOIN users u ON u.id = c.owner_id
           WHERE v.status = 'published'
           ORDER BY v.published_at DESC, v.id DESC
           LIMIT 21`,
    params: async () => [],
  },
  {
    name: 'catalog-next-page',
    sql: `SELECT v.id, v.title, v.published_at, c.title AS channel_title, u.display_name AS author_name
            FROM videos v
            JOIN channels c ON c.id = v.channel_id
            JOIN users u ON u.id = c.owner_id
           WHERE v.status = 'published'
             AND (v.published_at, v.id) < ($1::timestamptz, $2::bigint)
           ORDER BY v.published_at DESC, v.id DESC
           LIMIT 21`,
    // Курсор из середины каталога: 5000-я опубликованная строка
    params: async (db) => {
      const { rows } = await db.query(
        `SELECT published_at, id FROM videos WHERE status = 'published' ORDER BY published_at DESC, id DESC OFFSET 5000 LIMIT 1`,
      );
      return [rows[0].published_at, rows[0].id];
    },
  },
  {
    name: 'channel-videos',
    sql: `SELECT id, title, status, size_bytes, created_at
            FROM videos
           WHERE channel_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT 20`,
    // Самый крупный канал (1) — худший случай для списка канала
    params: async () => ['1'],
  },
  {
    name: 'user-favorites',
    sql: `SELECT v.id, v.title, c.title AS channel_title, f.created_at
            FROM favorites f
            JOIN videos v ON v.id = f.video_id
            JOIN channels c ON c.id = v.channel_id
           WHERE f.user_id = $1 AND v.status = 'published'
           ORDER BY f.created_at DESC, f.video_id DESC
           LIMIT 50`,
    params: async () => ['1'],
  },
];

async function main(): Promise<void> {
  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.connect();
  const outDir = resolve(process.cwd(), '../docs/perf');
  mkdirSync(outDir, { recursive: true });
  try {
    const { rows: version } = await db.query('SHOW server_version');
    const { rows: indexes } = await db.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('videos', 'favorites', 'video_tags') ORDER BY 1`,
    );
    const { rows: sizes } = await db.query(`SELECT (SELECT COUNT(*) FROM videos) AS videos, (SELECT COUNT(*) FROM video_tags) AS video_tags,
      (SELECT COUNT(*) FROM favorites) AS favorites, (SELECT COUNT(*) FROM channels) AS channels`);
    await db.query('ANALYZE');

    for (const experiment of EXPERIMENTS) {
      const params = await experiment.params(db);
      const times: number[] = [];
      let lastPlan = '';
      for (let i = 0; i < WARMUP + REPEATS; i++) {
        const { rows } = await db.query(`EXPLAIN (ANALYZE, BUFFERS) ${experiment.sql}`, params);
        const plan = rows.map((r) => r['QUERY PLAN']).join('\n');
        if (i >= WARMUP) {
          times.push(Number(/Execution Time: ([\d.]+) ms/.exec(plan)![1]));
          lastPlan = plan;
        }
      }
      const sorted = [...times].sort((a, b) => a - b);
      const report = [
        `-- ${experiment.name} [${label}]`,
        `-- PostgreSQL ${version[0].server_version}; данные: ${JSON.stringify(sizes[0])}`,
        `-- индексы: ${indexes.map((r) => r.indexname).join(', ')}`,
        `-- параметры: ${JSON.stringify(params)}`,
        `-- Execution Time по ${REPEATS} повторам после ${WARMUP} прогревов (ms): ${times.join(', ')}; min=${sorted[0]} median=${sorted[Math.floor(REPEATS / 2)]}`,
        experiment.sql.replace(/\s+/g, ' ').trim() + ';',
        '',
        lastPlan,
        '',
      ].join('\n');
      writeFileSync(resolve(outDir, `${experiment.name}.${label}.txt`), report);
      console.log(`${experiment.name} [${label}]: median ${sorted[Math.floor(REPEATS / 2)]} ms`);
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
