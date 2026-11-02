// Журнал конкурентной проверки квоты (этап 7). Запуск: npm run demo:race [-- --api http://localhost:3000]
// 1) два одновременных HTTP-запроса POST /videos на оставшуюся квоту (если API запущен);
// 2) управляемая проверка двумя сессиями pg: удержание первой транзакции, COMMIT и ROLLBACK.
// Канал для гонки создается заново и не смешивается с данными seed для измерений.
import { config } from 'dotenv';
import { Client } from 'pg';
import { RESERVE_QUOTA_SQL } from '../src/video/videos.repository.js';

config({ quiet: true });

const QUOTA = '104857600';
const SIZE = '83886080';
const OWNER = process.env.RACE_OWNER_ID ?? '6';
const apiArg = process.argv.indexOf('--api');
const API = apiArg > 0 ? process.argv[apiArg + 1] : undefined;
const started = Date.now();

const log = (session: string, message: string) => console.log(`[+${String(Date.now() - started).padStart(5)} ms] ${session.padEnd(6)} ${message}`);

async function connect(name: string): Promise<Client> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    application_name: `race-demo-${name}`,
    lock_timeout: 5000,
    statement_timeout: 10000,
  });
  await client.connect();
  return client;
}

async function state(db: Client, channelId: string): Promise<string> {
  const { rows } = await db.query(
    `SELECT c.quota_bytes, c.used_bytes, COUNT(v.id) AS videos, COALESCE(SUM(v.size_bytes), 0) AS sum_size
       FROM channels c LEFT JOIN videos v ON v.channel_id = c.id WHERE c.id = $1 GROUP BY c.id`,
    [channelId],
  );
  const r = rows[0];
  return `quota_bytes=${r.quota_bytes} used_bytes=${r.used_bytes} videos=${r.videos} sum(size_bytes)=${r.sum_size}`;
}

async function freshChannel(db: Client, title: string): Promise<string> {
  const { rows } = await db.query(`INSERT INTO channels (owner_id, title, quota_bytes) VALUES ($1, $2, $3) RETURNING id`, [OWNER, title, QUOTA]);
  return rows[0].id;
}

async function waitBlocked(db: Client, pid: number): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const { rows } = await db.query(`SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid = $1`, [pid]);
    if (rows[0]?.wait_event_type === 'Lock') return `${rows[0].wait_event_type}/${rows[0].wait_event}`;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('session B is not waiting for a lock');
}

async function httpRace(db: Client): Promise<void> {
  if (!API) {
    console.log('\n== HTTP: пропущено (передайте --api http://localhost:3000 при запущенном приложении)');
    return;
  }
  const channelId = await freshChannel(db, `Race HTTP ${new Date().toISOString()}`);
  console.log(`\n== HTTP: два одновременных POST /videos по ${SIZE} байт в канал ${channelId}`);
  log('db', `до:    ${await state(db, channelId)}`);
  const send = (title: string) =>
    fetch(`${API}/videos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-demo-user-id': OWNER },
      body: JSON.stringify({ channelId, title, sizeBytes: SIZE }),
    }).then(async (res) => ({ title, status: res.status, body: await res.text() }));
  const results = await Promise.all([send('Race HTTP A'), send('Race HTTP B')]);
  for (const r of results) log('http', `${r.title}: ${r.status} ${r.body.slice(0, 120)}`);
  log('db', `после: ${await state(db, channelId)}`);
}

async function controlled(db: Client, finishFirst: 'COMMIT' | 'ROLLBACK'): Promise<void> {
  const channelId = await freshChannel(db, `Race ${finishFirst} ${new Date().toISOString()}`);
  console.log(`\n== Две сессии, первая завершается ${finishFirst}; канал ${channelId}`);
  log('db', `до:    ${await state(db, channelId)}`);
  const a = await connect('A');
  const b = await connect('B');
  try {
    await a.query('BEGIN');
    log('A', 'BEGIN');
    const ra = await a.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER]);
    log('A', `UPDATE channels ... RETURNING -> rows=${ra.rowCount} (строка канала заблокирована)`);
    await a.query(`INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES ($1, 'Race A', $2, $3)`, [channelId, SIZE, `race/${channelId}/a`]);
    log('A', 'INSERT videos (транзакция удерживается)');

    await b.query('BEGIN');
    log('B', 'BEGIN');
    const pending = b.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER]);
    log('B', `UPDATE channels ... ждет: ${await waitBlocked(db, (b as unknown as { processID: number }).processID)}`);

    await a.query(finishFirst);
    log('A', finishFirst);
    const rb = await pending;
    log('B', `UPDATE после освобождения блокировки -> rows=${rb.rowCount}`);
    if (rb.rowCount === 1) {
      await b.query(`INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES ($1, 'Race B', $2, $3)`, [channelId, SIZE, `race/${channelId}/b`]);
      await b.query('COMMIT');
      log('B', 'INSERT videos, COMMIT -> 201');
    } else {
      await b.query('ROLLBACK');
      log('B', 'квоты нет -> ROLLBACK -> 409');
    }
    log('db', `после: ${await state(db, channelId)}`);
  } finally {
    await Promise.allSettled([a.end(), b.end()]);
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('demo only for the training database');
  const db = await connect('state');
  try {
    console.log(`База ${process.env.DB_NAME}; владелец каналов гонки — пользователь ${OWNER}; quota=${QUOTA}, размер видео=${SIZE}`);
    await httpRace(db);
    await controlled(db, 'COMMIT');
    await controlled(db, 'ROLLBACK');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
