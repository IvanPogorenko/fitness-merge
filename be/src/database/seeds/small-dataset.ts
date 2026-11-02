import type { QueryRunner } from 'typeorm';
import { truncateAll } from './seed-utils.js';

// Малый набор: 6 пользователей, 8 каналов, 40 видео, 12 тегов, 6 плейлистов, 30 записей избранного.
// Граничные случаи: канал 8 без видео; пользователи 4-6 без избранного; плейлисты 3-6 пустые;
// видео без тегов (1, 8 и опубликованное 40); одинаковые published_at; draft и hidden.
// Данные детерминированы: идентификаторы назначаются по порядку после RESTART IDENTITY.
export async function seedSmall(queryRunner: QueryRunner): Promise<void> {
  await truncateAll(queryRunner);

  for (let i = 1; i <= 6; i++) {
    await queryRunner.query(`INSERT INTO users (display_name, email) VALUES ($1, $2)`, [`Usuario ${i}`, `user${i}@example.com`]);
  }

  const channelsData = [
    { owner_id: 1, title: 'Canal de Ana', quota: 104857600 },
    { owner_id: 1, title: 'Canal de Ana 2', quota: 104857600 },
    { owner_id: 2, title: 'Fitness Total', quota: 104857600 },
    { owner_id: 3, title: 'Yoga & Relax', quota: 104857600 },
    { owner_id: 4, title: 'Cardio Extremo', quota: 104857600 },
    { owner_id: 5, title: 'Fuerza y Pesas', quota: 104857600 },
    { owner_id: 6, title: 'Salud y Nutrición', quota: 104857600 },
    { owner_id: 2, title: 'Canal Vacío (Caso Límite)', quota: 104857600 },
  ];
  for (const channel of channelsData) {
    await queryRunner.query(`INSERT INTO channels (owner_id, title, quota_bytes) VALUES ($1, $2, $3)`, [channel.owner_id, channel.title, channel.quota]);
  }

  const tagsData = ['cardio', 'yoga', 'strength', 'nutrition', 'stretching', 'HIIT', 'weights', 'meditation', 'health', 'beginners', 'advanced', 'relaxation'];
  for (const tagName of tagsData) {
    await queryRunner.query(`INSERT INTO tags (name) VALUES (LOWER(TRIM($1)))`, [tagName]);
  }

  const videosData: Array<{ channel: number; title: string; status: string; size: number; date: string | null; tags: number[] }> = [
    { channel: 1, title: 'V1 - Draft without tags', status: 'draft', size: 1000, date: null, tags: [] },
    { channel: 1, title: 'V2 - Published with tags', status: 'published', size: 2000, date: '2025-01-01T10:00:00Z', tags: [1, 2] },
    { channel: 2, title: 'V3 - Published same date', status: 'published', size: 3000, date: '2025-01-01T10:00:00Z', tags: [3] },
    { channel: 2, title: 'V4 - Hidden', status: 'hidden', size: 4000, date: null, tags: [4] },
    { channel: 3, title: 'V5 - Published same date', status: 'published', size: 5000, date: '2025-01-01T10:00:00Z', tags: [5, 6] },
    { channel: 3, title: 'V6 - Draft', status: 'draft', size: 6000, date: null, tags: [7] },
    { channel: 4, title: 'V7 - Published', status: 'published', size: 7000, date: '2025-01-02T10:00:00Z', tags: [8] },
    { channel: 4, title: 'V8 - Hidden without tags', status: 'hidden', size: 8000, date: null, tags: [] },
    { channel: 5, title: 'V9 - Published', status: 'published', size: 9000, date: '2025-01-03T10:00:00Z', tags: [9] },
    { channel: 5, title: 'V10 - Draft', status: 'draft', size: 10000, date: null, tags: [10, 11] },
  ];
  for (let i = 11; i <= 40; i++) {
    videosData.push({
      channel: (i % 7) + 1,
      title: `Test video ${i}`,
      status: i % 2 === 0 ? 'published' : 'draft',
      size: 10000 + i * 100,
      date: i % 2 === 0 ? '2025-01-05T10:00:00Z' : null,
      // Видео 40 — опубликованное без тегов (граничный случай для запроса 7)
      tags: i === 40 ? [] : [(i % 12) + 1],
    });
  }

  for (let i = 0; i < videosData.length; i++) {
    const video = videosData[i];
    const result: Array<{ id: string }> = await queryRunner.query(
      `INSERT INTO videos (channel_id, title, status, size_bytes, storage_key, published_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [video.channel, video.title, video.status, video.size, `vid_${i + 1}.mp4`, video.date],
    );
    await queryRunner.query(`UPDATE channels SET used_bytes = used_bytes + $1 WHERE id = $2`, [video.size, video.channel]);
    for (const tagId of video.tags) {
      await queryRunner.query(`INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2)`, [result[0].id, tagId]);
    }
  }

  const playlistsData = [
    { owner_id: 1, title: 'My Cardio Favorites' },
    { owner_id: 1, title: 'Yoga Routine' },
    { owner_id: 1, title: 'Empty Playlist (Edge Case)' },
    { owner_id: 2, title: 'Full Strength' },
    { owner_id: 2, title: 'Beginners Guide' },
    { owner_id: 3, title: 'Relaxation' },
  ];
  for (const playlist of playlistsData) {
    await queryRunner.query(`INSERT INTO playlists (owner_id, title) VALUES ($1, $2)`, [playlist.owner_id, playlist.title]);
  }
  await queryRunner.query(`INSERT INTO playlist_items (playlist_id, video_id, position) VALUES (1, 2, 1), (1, 3, 2), (2, 5, 1)`);

  // 30 записей избранного: пользователи 1-3 по 10 видео (id 2-11, среди них есть draft и hidden).
  // Пользователи 4-6 без избранного. created_at фиксирован, чтобы порядок выдачи был воспроизводимым.
  for (let userId = 1; userId <= 3; userId++) {
    for (let i = 1; i <= 10; i++) {
      await queryRunner.query(
        `INSERT INTO favorites (user_id, video_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, i + 1, `2025-02-0${userId}T12:00:${String(i).padStart(2, '0')}Z`],
      );
    }
  }
}
