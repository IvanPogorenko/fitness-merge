import { VideosRepository } from '../src/video/videos.repository.js';
import { asUser, channelState, createChannel, createTestApp, scalar, type TestApp } from './app.js';
import { resetSmallSeed } from './db.js';

const RACE_QUOTA = '104857600';
const RACE_SIZE = '83886080';

describe('API видео на PostgreSQL', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    // Независимые сценарии стартуют с одного и того же малого набора
    await resetSmallSeed(t.dataSource);
  });

  afterAll(async () => {
    await t.close();
  });

  // Проверка 2
  it('2. созданное видео остается в БД после перезапуска приложения', async () => {
    const created = await t
      .http()
      .post('/videos')
      .set(asUser(1))
      .send({ channelId: '1', title: 'Survives restart', sizeBytes: '1000' })
      .expect(201);

    await t.close();
    t = await createTestApp();

    const card = await t.http().get(`/videos/${created.body.id}`).set(asUser(1)).expect(200);
    expect(card.body).toMatchObject({ id: created.body.id, title: 'Survives restart', status: 'draft' });
  });

  // Проверка 3
  it('3. создание видео с тегами: одно видео, связи, used_bytes увеличен ровно на размер', async () => {
    const before = await channelState(t.dataSource, 1);

    const res = await t
      .http()
      .post('/videos')
      .set(asUser(1))
      .send({ channelId: '1', title: '  New video  ', description: 'desc', sizeBytes: '5000', tagIds: ['1', 2] })
      .expect(201);

    expect(res.body).toMatchObject({
      title: 'New video',
      description: 'desc',
      status: 'draft',
      sizeBytes: '5000',
      commentsEnabled: true,
      publishedAt: null,
      channel: { id: '1', title: 'Canal de Ana', ownerId: '1', ownerName: 'Usuario 1' },
      tags: [
        { id: '1', name: 'cardio' },
        { id: '2', name: 'yoga' },
      ],
    });
    expect(res.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const after = await channelState(t.dataSource, 1);
    expect(after).toEqual({
      used: String(BigInt(before.used) + 5000n),
      videos: String(Number(before.videos) + 1),
      links: String(Number(before.links) + 2),
    });
    expect(await scalar(t.dataSource, `SELECT storage_key FROM videos WHERE id = $1`, [res.body.id])).toMatch(/^videos\/1\/[0-9a-f-]{36}$/);
  });

  // Проверка 4
  it.each([
    ['пустое название', { channelId: '1', title: '   ', sizeBytes: '10' }],
    ['нулевой размер', { channelId: '1', title: 'ok', sizeBytes: '0' }],
    ['отрицательный размер', { channelId: '1', title: 'ok', sizeBytes: -5 }],
    ['лишнее поле status', { channelId: '1', title: 'ok', sizeBytes: '10', status: 'published' }],
    ['лишнее поле ownerId', { channelId: '1', title: 'ok', sizeBytes: '10', ownerId: '2' }],
    ['повтор tagIds', { channelId: '1', title: 'ok', sizeBytes: '10', tagIds: ['1', 1] }],
    // oxlint-disable-next-line no-loss-of-precision -- намеренно: JSON-число теряет точность, API обязан его отклонить
    ['небезопасное number для bigint', { channelId: '1', title: 'ok', sizeBytes: 9007199254740993 }],
  ])('4. %s → 400, таблицы и квота не изменены', async (_name, body) => {
    const before = await channelState(t.dataSource, 1);
    await t.http().post('/videos').set(asUser(1)).send(body).expect(400);
    expect(await channelState(t.dataSource, 1)).toEqual(before);
  });

  // Проверка 5
  it('5. несуществующий тег → 400, нет частично сохраненного видео и расхода квоты', async () => {
    const before = await channelState(t.dataSource, 1);
    const res = await t.http().post('/videos').set(asUser(1)).send({ channelId: '1', title: 'x', sizeBytes: '10', tagIds: ['1', '999'] }).expect(400);
    expect(res.body.message).toBe('Unknown tag id');
    expect(await channelState(t.dataSource, 1)).toEqual(before);
  });

  // Проверка 9
  it('9. недостаток квоты → 409, число видео и used_bytes прежние', async () => {
    const before = await channelState(t.dataSource, 1);
    const free = 104857600n - BigInt(before.used);
    await t
      .http()
      .post('/videos')
      .set(asUser(1))
      .send({ channelId: '1', title: 'Too big', sizeBytes: String(free + 1n) })
      .expect(409);
    expect(await channelState(t.dataSource, 1)).toEqual(before);

    // Ровно оставшаяся квота проходит
    await t.http().post('/videos').set(asUser(1)).send({ channelId: '1', title: 'Exact fit', sizeBytes: String(free) }).expect(201);
    expect((await channelState(t.dataSource, 1)).used).toBe('104857600');
  });

  // Проверка 10
  it('10. ошибка после изменения квоты и вставки видео → полный откат videos, video_tags и channels', async () => {
    const repository = t.app.get(VideosRepository);
    // Контролируемая ошибка вместо публичного API: связь с несуществующим тегом нарушает FK
    // уже после условного UPDATE channels и INSERT videos в той же транзакции
    const spy = vi.spyOn(repository, 'linkTags').mockImplementation(async (manager, videoId) => {
      expect(await manager.query(`SELECT used_bytes::text AS used FROM channels WHERE id = 1`)).not.toEqual([]);
      await manager.query(`INSERT INTO video_tags (video_id, tag_id) VALUES ($1, 999999)`, [videoId]);
    });
    const before = await channelState(t.dataSource, 1);
    const totalVideos = await scalar(t.dataSource, `SELECT COUNT(*)::text FROM videos`);
    try {
      const res = await t.http().post('/videos').set(asUser(1)).send({ channelId: '1', title: 'Rolled back', sizeBytes: '777', tagIds: ['1'] }).expect(400);
      expect(res.body.message).toBe('Unknown tag id');
    } finally {
      spy.mockRestore();
    }
    // Прямые запросы к трем таблицам
    expect(await channelState(t.dataSource, 1)).toEqual(before);
    expect(await scalar(t.dataSource, `SELECT COUNT(*)::text FROM videos`)).toBe(totalVideos);
    expect(await scalar(t.dataSource, `SELECT COUNT(*)::text FROM videos WHERE title = 'Rolled back'`)).toBe('0');
  });

  // Проверка 11 (HTTP-уровень). Управляемый вариант с двумя сессиями — в race.e2e-spec.ts
  it('11. две заявки на последнюю квоту: один 201, один 409, превышения нет', async () => {
    const channelId = await createChannel(t.dataSource, 6, RACE_QUOTA, 'Race channel');
    const send = (title: string) => t.http().post('/videos').set(asUser(6)).send({ channelId, title, sizeBytes: RACE_SIZE });

    const responses = await Promise.all([send('Race A'), send('Race B')]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await channelState(t.dataSource, channelId)).toEqual({ used: RACE_SIZE, videos: '1', links: '0' });
  });

  // Проверка 12
  it('12. изменение чужого видео → 403, чтение чужого draft → 404, данные прежние', async () => {
    // Видео 1 — draft канала 1 (владелец — пользователь 1)
    const before = await t.dataSource.query(`SELECT title, description, status FROM videos WHERE id = 1`);

    await t.http().patch('/videos/1').set(asUser(2)).send({ title: 'Hacked' }).expect(403);
    await t.http().patch('/videos/1/status').set(asUser(2)).send({ status: 'published' }).expect(403);
    await t.http().get('/videos/1').set(asUser(2)).expect(404);
    await t.http().get('/videos/1').expect(404);
    await t.http().get('/videos/999999').expect(404);

    expect(await t.dataSource.query(`SELECT title, description, status FROM videos WHERE id = 1`)).toEqual(before);
    // Владелец видит свой черновик
    await t.http().get('/videos/1').set(asUser(1)).expect(200);
  });

  it('PATCH и смена статуса владельцем: published_at сохраняется при повторной публикации', async () => {
    await t.http().patch('/videos/1').set(asUser(1)).send({ title: 'Renamed', description: null }).expect(200);
    await t.http().patch('/videos/1').set(asUser(1)).send({ sizeBytes: '1' }).expect(400);
    await t.http().patch('/videos/1').set(asUser(1)).send({}).expect(400);
    // draft нельзя сразу скрыть
    await t.http().patch('/videos/1/status').set(asUser(1)).send({ status: 'hidden' }).expect(409);

    const published = await t.http().patch('/videos/1/status').set(asUser(1)).send({ status: 'published' }).expect(200);
    expect(published.body).toMatchObject({ title: 'Renamed', description: null, status: 'published' });
    const firstPublishedAt = published.body.publishedAt;
    expect(firstPublishedAt).not.toBeNull();

    // Повтор текущего статуса безопасен
    await t.http().patch('/videos/1/status').set(asUser(1)).send({ status: 'published' }).expect(200);
    await t.http().patch('/videos/1/status').set(asUser(1)).send({ status: 'hidden' }).expect(200);
    const republished = await t.http().patch('/videos/1/status').set(asUser(1)).send({ status: 'published' }).expect(200);
    expect(republished.body.publishedAt).toBe(firstPublishedAt);
  });

  // Проверка 13
  it('13. hidden и draft не попадают в каталог и избранное', async () => {
    // Видео 2 опубликовано и есть в избранном пользователя 2
    const catalogIds = async () => {
      const ids: string[] = [];
      let cursor: string | null = null;
      do {
        const res: { body: { items: Array<{ id: string }>; nextCursor: string | null } } = await t.http().get('/videos').query({ limit: 100, ...(cursor ? { cursor } : {}) }).expect(200);
        ids.push(...res.body.items.map((v: { id: string }) => v.id));
        cursor = res.body.nextCursor;
      } while (cursor);
      return ids;
    };
    const favoriteIds = async () => (await t.http().get('/me/favorites').set(asUser(2)).expect(200)).body.map((v: { id: string }) => v.id);

    expect(await catalogIds()).toContain('2');
    expect(await favoriteIds()).toContain('2');

    await t.http().patch('/videos/2/status').set(asUser(1)).send({ status: 'hidden' }).expect(200);

    const catalog = await catalogIds();
    expect(catalog).not.toContain('2');
    expect(await favoriteIds()).not.toContain('2');
    await t.http().get('/videos/2').set(asUser(2)).expect(404);

    // В каталоге только published: сравнение с прямым запросом
    const published: Array<{ id: string }> = await t.dataSource.query(`SELECT id::text AS id FROM videos WHERE status = 'published' ORDER BY published_at DESC, id DESC`);
    expect(catalog).toEqual(published.map((r) => r.id));
    // Draft и hidden (видео 4, 6, 8, 10, 11) из избранного не возвращаются
    expect(await favoriteIds()).toEqual(['9', '7', '5', '3']);
  });

  // Проверка 14
  it('14. курсор при одинаковом published_at: на неизменном наборе нет повторов и пропусков', async () => {
    // В малом наборе 15 видео с published_at = 2025-01-05T10:00:00Z и 3 с 2025-01-01T10:00:00Z
    const expected: Array<{ id: string }> = await t.dataSource.query(`SELECT id::text AS id FROM videos WHERE status = 'published' ORDER BY published_at DESC, id DESC`);

    for (const limit of [1, 3, 4, 7]) {
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const res: { body: { items: Array<{ id: string }>; nextCursor: string | null } } = await t.http().get('/videos').query({ limit, ...(cursor ? { cursor } : {}) }).expect(200);
        expect(res.body.items.length).toBeLessThanOrEqual(limit);
        seen.push(...res.body.items.map((v: { id: string }) => v.id));
        cursor = res.body.nextCursor;
        pages++;
      } while (cursor);
      expect(seen).toEqual(expected.map((r) => r.id));
      expect(pages).toBe(Math.ceil(expected.length / limit));
    }

    // Фильтры сохраняются между страницами: поиск + курсор
    const first = await t.http().get('/videos').query({ q: 'test video', limit: 5 }).expect(200);
    const second = await t.http().get('/videos').query({ q: 'test video', limit: 5, cursor: first.body.nextCursor }).expect(200);
    for (const v of [...first.body.items, ...second.body.items]) expect(v.title).toMatch(/^Test video/);
    expect(new Set([...first.body.items, ...second.body.items].map((v: { id: string }) => v.id)).size).toBe(10);
  });

  it('каталог: поиск ищет % и _ буквально, limit ограничен 1..100, поврежденный курсор → 400', async () => {
    expect((await t.http().get('/videos').query({ q: '%' }).expect(200)).body.items).toEqual([]);
    expect((await t.http().get('/videos').query({ q: 'V_ -' }).expect(200)).body.items).toEqual([]);
    expect((await t.http().get('/videos').query({ q: 'v2 - pub' }).expect(200)).body.items.map((v: { id: string }) => v.id)).toEqual(['2']);
    expect((await t.http().get('/videos').query({ channelId: '4' }).expect(200)).body.items.map((v: { id: string }) => v.id)).toEqual(['38', '24', '7']);
    await t.http().get('/videos').query({ limit: 0 }).expect(400);
    await t.http().get('/videos').query({ limit: 101 }).expect(400);
    await t.http().get('/videos').query({ cursor: 'garbage' }).expect(400);
    await t.http().get('/videos').query({ sort: 'id' }).expect(400);
    await t.http().get('/videos/abc').expect(400);
  });

  it('идентификация: без пользователя 401, неизвестный пользователь 401, чужой канал 403, неизвестный канал 400', async () => {
    const body = { channelId: '1', title: 'x', sizeBytes: '1' };
    await t.http().post('/videos').send(body).expect(401);
    await t.http().post('/videos').set(asUser(999)).send(body).expect(401);
    await t.http().post('/videos').set(asUser(2)).send(body).expect(403);
    await t.http().post('/videos').set(asUser(1)).send({ ...body, channelId: '999' }).expect(400);
  });

  // Проверка 16
  it('16. bigint больше MAX_SAFE_INTEGER возвращается без потери точности', async () => {
    const channelId = await createChannel(t.dataSource, 1, '9223372036854775807', 'Huge channel');
    const size = '9007199254740993'; // Number(size) округлился бы до ...992
    expect(String(Number(size))).not.toBe(size);

    const res = await t.http().post('/videos').set(asUser(1)).send({ channelId, title: 'Huge', sizeBytes: size }).expect(201);
    expect(res.body.sizeBytes).toBe(size);
    expect(await scalar(t.dataSource, `SELECT size_bytes::text FROM videos WHERE id = $1`, [res.body.id])).toBe(size);
    expect((await channelState(t.dataSource, channelId)).used).toBe(size);
    expect((await t.http().get(`/videos/${res.body.id}`).set(asUser(1)).expect(200)).body.sizeBytes).toBe(size);
  });

  it('16. число SQL на страницу каталога и избранного фиксировано (нет N+1)', async () => {
    const countSql = async (request: () => Promise<unknown>) => {
      t.sqlStats.reset();
      await request();
      return t.sqlStats.count;
    };
    const catalog5 = await countSql(() => t.http().get('/videos').query({ limit: 5 }).expect(200));
    const catalog20 = await countSql(() => t.http().get('/videos').query({ limit: 20 }).expect(200));
    // Страница видео (с каналом и автором) + пакетная загрузка тегов
    expect(catalog5).toBe(2);
    expect(catalog20).toBe(2);

    const favorites = await countSql(() => t.http().get('/me/favorites').set(asUser(1)).expect(200));
    // Проверка пользователя demo-режима + страница избранного + пакет тегов
    expect(favorites).toBe(3);
  });
});
