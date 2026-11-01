import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateVideoContentTables1700000000001 implements MigrationInterface {
    
  public async up(queryRunner: QueryRunner): Promise<void> {
    
    // ==========================================
    // 1. TABLE: videos
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'videos', 
        columns: [ 
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity' },
          { name: 'channel_id', type: 'bigint', isNullable: false },
          { name: 'title', type: 'text', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'status', type: 'text', isNullable: false, default: "'draft'" },
          { name: 'size_bytes', type: 'bigint', isNullable: false },
          { name: 'storage_key', type: 'text', isNullable: false, isUnique: true },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' }, // <-- Faltaba
          { name: 'published_at', type: 'timestamptz', isNullable: true },
        ],
      }),
      true,
    );

    // FK: videos.channel_id -> channels.id (RESTRICT)
    await queryRunner.createForeignKey(
      'videos',
      new TableForeignKey({
        columnNames: ['channel_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'channels',
        onDelete: 'RESTRICT',
      }),
    );

    // CHECK constraints para videos
    await queryRunner.query(`
      ALTER TABLE videos
      ADD CONSTRAINT check_video_status CHECK (status IN ('draft', 'published', 'hidden')),
      ADD CONSTRAINT check_size_positive CHECK (size_bytes > 0);
    `);
    
    // ==========================================
    // 2. TABLE: tags
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity' },
          { name: 'name', type: 'text', isNullable: false },
        ],
      }),
      true,
    );

    // Índice único funcional para tags (LOWER + TRIM)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_tags_name_lower_trim ON tags (LOWER(TRIM(name)));
    `);

    // ==========================================
    // 3. TABLE: video_tags 
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'video_tags',
        columns: [
          // Marcamos ambas columnas como isPrimary: true para crear la PK Compuesta
          { name: 'video_id', type: 'bigint', isPrimary: true, isNullable: false },
          { name: 'tag_id', type: 'bigint', isPrimary: true, isNullable: false },
        ],
      }),
      true,
    );

    // FK: video_tags.video_id -> videos.id (CASCADE)
    await queryRunner.createForeignKey(
      'video_tags',
      new TableForeignKey({
        columnNames: ['video_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'videos',
        onDelete: 'CASCADE',
      }),
    );

    // FK: video_tags.tag_id -> tags.id (CASCADE)
    await queryRunner.createForeignKey(
      'video_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tags',
        onDelete: 'CASCADE',
      }),
    );
  }

  // ==========================================
  // MÉTODO DOWN (Borrado en orden inverso)
  // ==========================================
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Primero borramos la tabla intermedia
    await queryRunner.dropTable('video_tags');
    // Luego las tablas principales
    await queryRunner.dropTable('tags');
    await queryRunner.dropTable('videos');
  }
}
