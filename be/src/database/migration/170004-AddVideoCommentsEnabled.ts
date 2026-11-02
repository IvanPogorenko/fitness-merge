import { MigrationInterface, QueryRunner } from 'typeorm';

// Вторая миграция по заданию: обновление уже заполненной базы без удаления данных.
// Существующие видео получают true — до появления признака комментарии ничем не ограничивались.
export class AddVideoCommentsEnabled1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE videos ADD COLUMN comments_enabled boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откат теряет значения comments_enabled, в том числе выключенные владельцами false
    await queryRunner.query(`ALTER TABLE videos DROP COLUMN comments_enabled`);
  }
}
