import type { DataSource } from 'typeorm';
import { deployFromScratch, MIGRATION_COUNT, resetSmallSeed, testDataSource } from './db.js';

async function expectRejected(dataSource: DataSource, sql: string, params: unknown[], code: string, constraint: string) {
  const error: { driverError?: { code?: string; constraint?: string } } = await dataSource.query(sql, params).then(
    () => ({}),
    (e) => e,
  );
  expect({ code: error.driverError?.code, constraint: error.driverError?.constraint }).toEqual({ code, constraint });
}

describe('Схема и миграции', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = testDataSource();
    await dataSource.initialize();
  });

  afterAll(async () => {
    await resetSmallSeed(dataSource);
    await dataSource.destroy();
  });

  // Проверка 1
  it('1. развертывание с нуля: миграции и seed проходят без ручного SQL', async () => {
    const applied = await deployFromScratch(dataSource);
    expect(applied).toHaveLength(MIGRATION_COUNT);

    const [counts] = await dataSource.query(`
      SELECT (SELECT COUNT(*) FROM users)::int AS users, (SELECT COUNT(*) FROM channels)::int AS channels,
             (SELECT COUNT(*) FROM videos)::int AS videos, (SELECT COUNT(*) FROM tags)::int AS tags,
             (SELECT COUNT(*) FROM playlists)::int AS playlists, (SELECT COUNT(*) FROM favorites)::int AS favorites`);
    expect(counts).toEqual({ users: 6, channels: 8, videos: 40, tags: 12, playlists: 6, favorites: 30 });

    // used_bytes сверяется с COALESCE(SUM(size_bytes), 0), включая канал без видео
    const mismatches = await dataSource.query(`
      SELECT c.id FROM channels c LEFT JOIN videos v ON v.channel_id = c.id
       GROUP BY c.id, c.used_bytes HAVING c.used_bytes <> COALESCE(SUM(v.size_bytes), 0)`);
    expect(mismatches).toEqual([]);
  });

  // Проверка 6: каждое правило отклоняет сама база, без участия приложения
  describe('6. FK, CHECK и уникальность прямым SQL', () => {
    it.each([
      ['FK канала на пользователя', `INSERT INTO channels (owner_id, title, quota_bytes) VALUES (999, 'x', 10)`, '23503', 'fk_channels_owner'],
      ['FK видео на канал', `INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES (999, 'x', 1, 'k-fk')`, '23503', 'fk_videos_channel'],
      ['FK связи на тег', `INSERT INTO video_tags (video_id, tag_id) VALUES (1, 999)`, '23503', 'fk_video_tags_tag'],
      ['RESTRICT при удалении владельца канала', `DELETE FROM users WHERE id = 1`, '23503', 'fk_channels_owner'],
      ['used_bytes > quota_bytes', `UPDATE channels SET used_bytes = quota_bytes + 1 WHERE id = 8`, '23514', 'chk_channels_used_bytes_within_quota'],
      ['отрицательный used_bytes', `UPDATE channels SET used_bytes = -1 WHERE id = 8`, '23514', 'chk_channels_used_bytes_within_quota'],
      ['неизвестный статус', `UPDATE videos SET status = 'deleted' WHERE id = 1`, '23514', 'chk_videos_status'],
      ['нулевой размер', `INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES (8, 'x', 0, 'k-size')`, '23514', 'chk_videos_size_positive'],
      ['published без published_at', `UPDATE videos SET status = 'published', published_at = NULL WHERE id = 1`, '23514', 'chk_videos_published_has_date'],
      ['пустое название', `UPDATE videos SET title = '   ' WHERE id = 1`, '23514', 'chk_videos_title_not_blank'],
      ['position <= 0', `INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (3, 2, 0)`, '23514', 'chk_playlist_items_position_positive'],
      ['повтор storage_key', `INSERT INTO videos (channel_id, title, size_bytes, storage_key) VALUES (8, 'x', 1, 'vid_1.mp4')`, '23505', 'uq_videos_storage_key'],
      ['email после нормализации', `INSERT INTO users (display_name, email) VALUES ('Dup', '  USER1@Example.com ')`, '23505', 'uq_users_email_normalized'],
      ['имя тега после trim и нижнего регистра', `INSERT INTO tags (name) VALUES (' Cardio ')`, '23505', 'uq_tags_name_normalized'],
      ['повтор пары избранного', `INSERT INTO favorites (user_id, video_id) VALUES (1, 2)`, '23505', 'pk_favorites'],
      ['повтор позиции в плейлисте', `INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (1, 5, 1)`, '23505', 'uq_playlist_items_position'],
    ])('%s', async (_name, sql, code, constraint) => {
      await expectRejected(dataSource, sql, [], code, constraint);
    });
  });
});

// Откат второй миграции и повторное применение — на отдельной одноразовой базе
describe('Миграция comments_enabled на заполненной базе', () => {
  let scratch: DataSource;

  beforeAll(async () => {
    scratch = testDataSource(process.env.DB_SCRATCH_NAME ?? 'fitness_merge_scratch');
    await scratch.initialize();
    await deployFromScratch(scratch);
  });

  afterAll(async () => {
    await scratch.destroy();
  });

  it('откат удаляет столбец без потери строк, повторное применение возвращает его со значением true', async () => {
    await scratch.query(`UPDATE videos SET comments_enabled = false WHERE id = 2`);

    // Последней идет миграция индексов, перед ней — comments_enabled
    await scratch.undoLastMigration({ transaction: 'each' });
    await scratch.undoLastMigration({ transaction: 'each' });
    const columns = await scratch.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'comments_enabled'`);
    expect(columns).toEqual([]);
    expect(await scratch.query(`SELECT COUNT(*)::int AS n FROM videos`)).toEqual([{ n: 40 }]);

    await scratch.runMigrations({ transaction: 'each' });
    // Значение false у видео 2 потеряно при откате: после повторного применения у всех строк true
    expect(await scratch.query(`SELECT comments_enabled, COUNT(*)::int AS n FROM videos GROUP BY comments_enabled`)).toEqual([
      { comments_enabled: true, n: 40 },
    ]);
  });
});
