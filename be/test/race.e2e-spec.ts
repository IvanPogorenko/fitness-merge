import type { Client } from 'pg';
import { RESERVE_QUOTA_SQL } from '../src/video/videos.repository.js';
import { channelState, createChannel, createTestApp, type TestApp } from './app.js';
import { rawClient, resetSmallSeed } from './db.js';

const QUOTA = '104857600';
const SIZE = '83886080';
const OWNER = '6';

// Проверка 11, управляемый вариант: две сессии, первая удерживает транзакцию после условного UPDATE.
// Read Committed: вторая сессия ждет блокировку строки канала, а после ее освобождения
// PostgreSQL перепроверяет WHERE по новой версии строки (EvalPlanQual).
describe('11. Гонка за последнюю квоту на двух соединениях', () => {
  let t: TestApp;
  let first: Client;
  let second: Client;
  let channelId: string;

  const insertVideo = (client: Client, title: string, key: string) =>
    client.query(`INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES ($1, $2, $3, $4)`, [channelId, title, SIZE, key]);

  async function waitUntilBlocked(client: Client): Promise<void> {
    const pid = (client as unknown as { processID: number }).processID;
    for (let attempt = 0; attempt < 50; attempt++) {
      const [row] = await t.dataSource.query(`SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1`, [pid]);
      if (row?.wait_event_type === 'Lock') return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Second session did not block on the channel row');
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetSmallSeed(t.dataSource);
    // Отдельный канал для гонки: quota 100 MiB, used 0, без видео
    channelId = await createChannel(t.dataSource, Number(OWNER), QUOTA, 'Race channel');
    first = await rawClient();
    second = await rawClient();
  });

  afterEach(async () => {
    // Соединения освобождаются даже при падении проверки
    await Promise.allSettled([first.query('ROLLBACK'), second.query('ROLLBACK')]);
    await Promise.allSettled([first.end(), second.end()]);
  });

  afterAll(async () => {
    await t.close();
  });

  it('первая подтверждает — вторая после освобождения блокировки не получает квоту', async () => {
    await first.query('BEGIN');
    const reservedFirst = await first.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER]);
    expect(reservedFirst.rowCount).toBe(1);
    await insertVideo(first, 'Race A', 'race/a');

    await second.query('BEGIN');
    const pendingSecond = second.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER]);
    await waitUntilBlocked(second);

    await first.query('COMMIT');
    const reservedSecond = await pendingSecond;
    expect(reservedSecond.rowCount).toBe(0);
    await second.query('ROLLBACK');

    expect(await channelState(t.dataSource, channelId)).toEqual({ used: SIZE, videos: '1', links: '0' });
  });

  it('первая откатывается — квота достается второй', async () => {
    await first.query('BEGIN');
    expect((await first.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER])).rowCount).toBe(1);
    await insertVideo(first, 'Race A', 'race/a');

    await second.query('BEGIN');
    const pendingSecond = second.query(RESERVE_QUOTA_SQL, [SIZE, channelId, OWNER]);
    await waitUntilBlocked(second);

    await first.query('ROLLBACK');
    expect((await pendingSecond).rowCount).toBe(1);
    await insertVideo(second, 'Race B', 'race/b');
    await second.query('COMMIT');

    expect(await channelState(t.dataSource, channelId)).toEqual({ used: SIZE, videos: '1', links: '0' });
    expect(await t.dataSource.query(`SELECT title FROM videos WHERE channel_id = $1`, [channelId])).toEqual([{ title: 'Race B' }]);
  });

  it('наивный «прочитать used_bytes, затем записать» без условия теряет инвариант (для сравнения)', async () => {
    // Обе сессии читают used_bytes = 0 и обе решают, что места хватает
    const naiveCheck = async (client: Client) => {
      const { rows } = await client.query(`SELECT quota_bytes - used_bytes AS free FROM channels WHERE id = $1`, [channelId]);
      return BigInt(rows[0].free) >= BigInt(SIZE);
    };
    await first.query('BEGIN');
    await second.query('BEGIN');
    expect(await naiveCheck(first)).toBe(true);
    expect(await naiveCheck(second)).toBe(true);

    // CHECK в базе — последний рубеж: вторая запись нарушает used_bytes <= quota_bytes
    await first.query(`UPDATE channels SET used_bytes = used_bytes + $1 WHERE id = $2`, [SIZE, channelId]);
    const pendingSecond = second.query(`UPDATE channels SET used_bytes = used_bytes + $1 WHERE id = $2`, [SIZE, channelId]);
    await waitUntilBlocked(second);
    await first.query('COMMIT');
    await expect(pendingSecond).rejects.toMatchObject({ code: '23514', constraint: 'chk_channels_used_bytes_within_quota' });
  });
});
