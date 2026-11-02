import type { QueryRunner } from 'typeorm';
import { createRandom, truncateAll } from './seed-utils.js';

// Расширенный набор для планов выполнения: ~12 000 видео, >30 000 video_tags, 400 каналов
// с неравномерным (степенным) распределением видео. Начальное значение генератора фиксировано.
export const LARGE_SEED = 20261101;
const USERS = 600;
const CHANNELS = 400;
const VIDEOS = 12000;
const TAGS = 60;
const PLAYLISTS = 300;
const FAVORITES = 60000;
const BATCH = 2000;

const TAG_NAMES = [
  'cardio', 'yoga', 'strength', 'nutrition', 'stretching', 'hiit', 'weights', 'meditation', 'health', 'beginners',
  'advanced', 'relaxation', 'running', 'cycling', 'swimming', 'pilates', 'crossfit', 'boxing', 'dance', 'mobility',
  'core', 'legs', 'arms', 'back', 'chest', 'shoulders', 'glutes', 'warmup', 'cooldown', 'recovery',
  'breathing', 'posture', 'balance', 'endurance', 'speed', 'agility', 'power', 'flexibility', 'home', 'gym',
  'outdoor', 'kids', 'seniors', 'pregnancy', 'rehab', 'diet', 'vegan', 'protein', 'sleep', 'motivation',
  'challenge', 'routine', 'morning', 'evening', 'quick', 'long', 'equipment-free', 'kettlebell', 'band', 'stretch-band',
];

async function insertBatches<T>(queryRunner: QueryRunner, rows: T[], insert: (chunk: T[]) => Promise<void>): Promise<void> {
  for (let start = 0; start < rows.length; start += BATCH) {
    await insert(rows.slice(start, start + BATCH));
  }
}

export async function seedLarge(queryRunner: QueryRunner): Promise<void> {
  const random = createRandom(LARGE_SEED);
  await truncateAll(queryRunner);

  const users = Array.from({ length: USERS }, (_, i) => ({ id: i + 1, name: `Demo user ${i + 1}`, email: `large.user${i + 1}@example.test` }));
  await insertBatches(queryRunner, users, (chunk) =>
    queryRunner.query(
      `INSERT INTO users (id, display_name, email) OVERRIDING SYSTEM VALUE
       SELECT * FROM unnest($1::bigint[], $2::text[], $3::text[])`,
      [chunk.map((u) => u.id), chunk.map((u) => u.name), chunk.map((u) => u.email)],
    ),
  );

  // Веса каналов ~ 1/k^0.9: несколько крупных каналов и длинный хвост маленьких; последние 10 каналов пустые
  const weights = Array.from({ length: CHANNELS }, (_, i) => (i >= CHANNELS - 10 ? 0 : 1 / Math.pow(i + 1, 0.9)));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const cumulative: number[] = [];
  weights.reduce((acc, w, i) => (cumulative[i] = acc + w / totalWeight), 0);
  const pickChannel = () => {
    const r = random.next();
    const index = cumulative.findIndex((c) => r < c);
    return (index === -1 ? CHANNELS - 11 : index) + 1;
  };

  await insertBatches(queryRunner, TAG_NAMES.slice(0, TAGS).map((name, i) => ({ id: i + 1, name })), (chunk) =>
    queryRunner.query(`INSERT INTO tags (id, name) OVERRIDING SYSTEM VALUE SELECT * FROM unnest($1::bigint[], $2::text[])`, [
      chunk.map((t) => t.id),
      chunk.map((t) => t.name),
    ]),
  );

  const start = Date.UTC(2024, 0, 1);
  const span = Date.UTC(2026, 9, 1) - start;
  const videos = Array.from({ length: VIDEOS }, (_, i) => {
    const roll = random.next();
    const status = roll < 0.8 ? 'published' : roll < 0.92 ? 'draft' : 'hidden';
    const created = start + Math.floor(random.next() * span);
    // Около 5% опубликованных видео делят одну и ту же секунду публикации (проверка курсора)
    const published =
      status === 'draft' || (status === 'hidden' && random.next() < 0.3)
        ? null
        : random.next() < 0.05
          ? Date.UTC(2026, 5, 1, 12, 0, 0)
          : created + random.int(0, 7 * 24 * 3600 * 1000);
    return {
      id: i + 1,
      channelId: pickChannel(),
      title: `Large video ${i + 1} ${random.pick(TAG_NAMES)}`,
      status,
      size: random.int(1, 500) * 1048576 + random.int(0, 1048575),
      createdAt: new Date(created).toISOString(),
      publishedAt: published === null ? null : new Date(published).toISOString(),
    };
  });

  const usedByChannel = new Map<number, bigint>();
  for (const video of videos) {
    usedByChannel.set(video.channelId, (usedByChannel.get(video.channelId) ?? 0n) + BigInt(video.size));
  }
  // Квота с запасом: занято не больше половины + 10 GiB свободно
  const channels = Array.from({ length: CHANNELS }, (_, i) => {
    const used = usedByChannel.get(i + 1) ?? 0n;
    return { id: i + 1, ownerId: random.int(1, USERS / 2), title: `Large channel ${i + 1}`, quota: (used * 2n + 10737418240n).toString(), used: used.toString() };
  });
  await insertBatches(queryRunner, channels, (chunk) =>
    queryRunner.query(
      `INSERT INTO channels (id, owner_id, title, quota_bytes, used_bytes) OVERRIDING SYSTEM VALUE
       SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::text[], $4::bigint[], $5::bigint[])`,
      [chunk.map((c) => c.id), chunk.map((c) => c.ownerId), chunk.map((c) => c.title), chunk.map((c) => c.quota), chunk.map((c) => c.used)],
    ),
  );

  await insertBatches(queryRunner, videos, (chunk) =>
    queryRunner.query(
      `INSERT INTO videos (id, channel_id, title, status, size_bytes, storage_key, created_at, published_at) OVERRIDING SYSTEM VALUE
       SELECT id, channel_id, title, status, size_bytes, 'large/' || id || '.mp4', created_at, published_at
         FROM unnest($1::bigint[], $2::bigint[], $3::text[], $4::text[], $5::bigint[], $6::timestamptz[], $7::timestamptz[])
              AS t(id, channel_id, title, status, size_bytes, created_at, published_at)`,
      [
        chunk.map((v) => v.id),
        chunk.map((v) => v.channelId),
        chunk.map((v) => v.title),
        chunk.map((v) => v.status),
        chunk.map((v) => v.size),
        chunk.map((v) => v.createdAt),
        chunk.map((v) => v.publishedAt),
      ],
    ),
  );

  // 1-5 тегов у большинства видео, ~4% без тегов
  const videoTags: Array<[number, number]> = [];
  for (const video of videos) {
    const count = random.next() < 0.04 ? 0 : random.int(1, 5);
    const chosen = new Set<number>();
    while (chosen.size < count) chosen.add(random.int(1, TAGS));
    for (const tagId of chosen) videoTags.push([video.id, tagId]);
  }
  await insertBatches(queryRunner, videoTags, (chunk) =>
    queryRunner.query(`INSERT INTO video_tags (video_id, tag_id) SELECT * FROM unnest($1::bigint[], $2::bigint[])`, [
      chunk.map((p) => p[0]),
      chunk.map((p) => p[1]),
    ]),
  );

  const publishedIds = videos.filter((v) => v.status === 'published').map((v) => v.id);
  const favoriteKeys = new Set<string>();
  const favorites: Array<[number, number, string]> = [];
  while (favorites.length < FAVORITES) {
    // Активные пользователи (первая треть) добавляют в избранное чаще
    const userId = random.next() < 0.7 ? random.int(1, USERS / 3) : random.int(1, USERS);
    const videoId = random.pick(publishedIds);
    const key = `${userId}:${videoId}`;
    if (favoriteKeys.has(key)) continue;
    favoriteKeys.add(key);
    favorites.push([userId, videoId, new Date(start + Math.floor(random.next() * span)).toISOString()]);
  }
  await insertBatches(queryRunner, favorites, (chunk) =>
    queryRunner.query(`INSERT INTO favorites (user_id, video_id, created_at) SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::timestamptz[])`, [
      chunk.map((f) => f[0]),
      chunk.map((f) => f[1]),
      chunk.map((f) => f[2]),
    ]),
  );

  const playlists = Array.from({ length: PLAYLISTS }, (_, i) => ({ id: i + 1, ownerId: random.int(1, USERS), title: `Large playlist ${i + 1}` }));
  await queryRunner.query(
    `INSERT INTO playlists (id, owner_id, title) OVERRIDING SYSTEM VALUE SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::text[])`,
    [playlists.map((p) => p.id), playlists.map((p) => p.ownerId), playlists.map((p) => p.title)],
  );
  const items: Array<[number, number, number]> = [];
  for (const playlist of playlists) {
    const count = random.int(0, 25);
    const chosen = new Set<number>();
    while (chosen.size < count) chosen.add(random.pick(publishedIds));
    [...chosen].forEach((videoId, index) => items.push([playlist.id, videoId, index + 1]));
  }
  await insertBatches(queryRunner, items, (chunk) =>
    queryRunner.query(`INSERT INTO playlist_items (playlist_id, video_id, position) SELECT * FROM unnest($1::bigint[], $2::bigint[], $3::int[])`, [
      chunk.map((i) => i[0]),
      chunk.map((i) => i[1]),
      chunk.map((i) => i[2]),
    ]),
  );

  // Следующие identity-значения после явной вставки идентификаторов
  for (const table of ['users', 'channels', 'videos', 'tags', 'playlists']) {
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`);
  }
}
