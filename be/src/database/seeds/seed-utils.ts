import type { DataSource, QueryRunner } from 'typeorm';

export const ALL_TABLES = 'favorites, playlist_items, playlists, video_tags, videos, tags, channels, users';

export function assertTrainingEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed стирает данные и запускается только в учебной среде (NODE_ENV != production)');
  }
}

export async function truncateAll(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`TRUNCATE TABLE ${ALL_TABLES} RESTART IDENTITY CASCADE`);
}

// Сверка сохраненного итога used_bytes с источником истины — суммой size_bytes всех видео канала
export async function findUsedBytesMismatches(queryRunner: QueryRunner): Promise<Array<{ channel_id: string; used_bytes: string; actual: string }>> {
  return queryRunner.query(`
    SELECT c.id AS channel_id, c.used_bytes::text AS used_bytes, COALESCE(SUM(v.size_bytes), 0)::text AS actual
      FROM channels c
      LEFT JOIN videos v ON v.channel_id = c.id
     GROUP BY c.id, c.used_bytes
    HAVING c.used_bytes <> COALESCE(SUM(v.size_bytes), 0)
     ORDER BY c.id
  `);
}

export async function runInTransaction(dataSource: DataSource, work: (queryRunner: QueryRunner) => Promise<void>): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await work(queryRunner);
    const mismatches = await findUsedBytesMismatches(queryRunner);
    if (mismatches.length > 0) {
      throw new Error(`used_bytes не совпадает с суммой видео: ${JSON.stringify(mismatches)}`);
    }
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Детерминированный генератор (mulberry32): одинаковое начальное значение дает одинаковые данные
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}
