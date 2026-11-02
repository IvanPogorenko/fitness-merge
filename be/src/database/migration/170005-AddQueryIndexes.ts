import { MigrationInterface, QueryRunner } from 'typeorm';

// Индексы под реальные запросы (этап 8). Обоснование и планы до/после — docs/performance.md.
// PostgreSQL не создает индексы на ссылающихся столбцах FK автоматически.
export class AddQueryIndexes1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Публичный каталог: WHERE status = 'published' ORDER BY published_at DESC, id DESC + курсор по той же паре
    await queryRunner.query(`
      CREATE INDEX idx_videos_catalog_published
        ON videos (published_at DESC, id DESC)
        WHERE status = 'published'
    `);
    // Список видео канала: WHERE channel_id = $1 [AND status = $2] ORDER BY created_at DESC, id DESC
    // (также ускоряет проверку FK при удалении канала)
    await queryRunner.query(`CREATE INDEX idx_videos_channel_created ON videos (channel_id, created_at DESC, id DESC)`);
    // Избранное пользователя: WHERE user_id = $1 ORDER BY created_at DESC, video_id DESC
    await queryRunner.query(`CREATE INDEX idx_favorites_user_created ON favorites (user_id, created_at DESC, video_id DESC)`);
    // Обратный поиск по тегу: PK video_tags начинается с video_id и не помогает WHERE tag_id = $1
    await queryRunner.query(`CREATE INDEX idx_video_tags_tag ON video_tags (tag_id, video_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_video_tags_tag`);
    await queryRunner.query(`DROP INDEX idx_favorites_user_created`);
    await queryRunner.query(`DROP INDEX idx_videos_channel_created`);
    await queryRunner.query(`DROP INDEX idx_videos_catalog_published`);
  }
}
