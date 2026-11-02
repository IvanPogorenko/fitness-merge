import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { asUser, createTestApp, scalar, type TestApp } from './app.js';
import { resetSmallSeed } from './db.js';

const favoritesOf = (t: TestApp, userId: number) =>
  t.dataSource.query(`SELECT video_id::text AS video_id FROM favorites WHERE user_id = $1 ORDER BY video_id`, [userId]);

describe('Избранное', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetSmallSeed(t.dataSource);
  });

  afterAll(async () => {
    await t.close();
  });

  // Проверка 7
  it('7. два одновременных добавления в избранное: одна связь, оба ответа 204', async () => {
    // Пользователь 4 без избранного, видео 12 опубликовано
    const responses = await Promise.all([1, 2, 3].map(() => t.http().put('/me/favorites/12').set(asUser(4))));
    expect(responses.map((r) => r.status)).toEqual([204, 204, 204]);
    expect(await favoritesOf(t, 4)).toEqual([{ video_id: '12' }]);
  });

  it('добавить можно только доступное published-видео', async () => {
    await t.http().put('/me/favorites/1').set(asUser(4)).expect(404); // draft
    await t.http().put('/me/favorites/4').set(asUser(4)).expect(404); // hidden
    await t.http().put('/me/favorites/999999').set(asUser(4)).expect(404);
    await t.http().put('/me/favorites/12').expect(401);
    expect(await favoritesOf(t, 4)).toEqual([]);
  });

  // Проверка 8
  it('8. повторное удаление → 204, связи нет, чужие связи не затронуты', async () => {
    const othersBefore = await t.dataSource.query(`SELECT user_id, video_id FROM favorites WHERE user_id <> 1 ORDER BY 1, 2`);

    await t.http().delete('/me/favorites/2').set(asUser(1)).expect(204);
    await t.http().delete('/me/favorites/2').set(asUser(1)).expect(204);
    await t.http().delete('/me/favorites/999999').set(asUser(1)).expect(204);

    expect(await scalar(t.dataSource, `SELECT COUNT(*)::text FROM favorites WHERE user_id = 1 AND video_id = 2`)).toBe('0');
    expect(await t.dataSource.query(`SELECT user_id, video_id FROM favorites WHERE user_id <> 1 ORDER BY 1, 2`)).toEqual(othersBefore);
  });

  // Проверка 15
  it('15. LEFT JOIN и пустые связи: канал без видео и пользователи без избранного дают нули', async () => {
    const queries = readFileSync(resolve(process.cwd(), '../sql/queries.sql'), 'utf8');
    const query = (n: number) => {
      const match = queries.match(new RegExp(`-- QUERY ${n}:[\\s\\S]*?\\n(SELECT[\\s\\S]*?;)`));
      if (!match) throw new Error(`QUERY ${n} not found in sql/queries.sql`);
      return match[1];
    };

    // Запрос 4: все каналы и число опубликованных видео
    const channels: Array<{ id: string; published_videos_count: string }> = await t.dataSource.query(query(4));
    expect(channels).toHaveLength(8);
    expect(channels.find((c) => c.id === '8')).toMatchObject({ published_videos_count: '0' });

    // Запрос 5: все пользователи и число записей избранного
    const users: Array<{ id: string; favorites_count: string }> = await t.dataSource.query(query(5));
    expect(users.map((u) => [u.id, u.favorites_count])).toEqual([
      ['1', '10'],
      ['2', '10'],
      ['3', '10'],
      ['4', '0'],
      ['5', '0'],
      ['6', '0'],
    ]);

    // Запрос 10: сверка used_bytes для всех каналов, включая пустой
    const usage: Array<{ channel_id: string; stored_used_bytes: string; actual_sum_bytes: string }> = await t.dataSource.query(query(10));
    expect(usage).toHaveLength(8);
    for (const row of usage) expect(row.stored_used_bytes).toBe(row.actual_sum_bytes);
    expect(usage.find((r) => r.channel_id === '8')).toMatchObject({ stored_used_bytes: '0', actual_sum_bytes: '0' });

    // API: пользователь без избранного получает пустой список
    expect((await t.http().get('/me/favorites').set(asUser(4)).expect(200)).body).toEqual([]);
  });
});
