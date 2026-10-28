import { query } from 'axios';
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateVideoContentTables1700000000001 implements MigrationInterface {
    
    public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
        new Table({
            name: 'videos', 
            columns: [ 
                { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity' },
                { name: 'channel_id', type: 'bigint', isNullable: false },
                { name: 'title', type: 'text', isNullable: false },
                { name: 'description', type:'text', isNullable: true},
                { name: 'status', type: 'text', isNullable: false, default: "'draft'" },
                { name: 'size_bytes', type: 'bigint', isNullable:false },
                { name: 'storage_key', type: 'text', isNullable: false, isUnique: true },
                { name: 'published_at', type: 'timestamptz', isNullable:true },
            ],
        }),
        true,
    );

    await queryRunner.createForeignKey(
        'videos',
        new TableForeignKey({
            columnNames: ['channel_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'channels',
            onDelete: 'RESTRICT',
        }),
    );

    await queryRunner.query(
        `ALTER TABLE videos
        ADD CONSTRAINT check_video_status CHECK (status IN ('draft', 'published', 'hidden')),
        ADD CONSTRAINT check_size_positive CHECK (size_bytes > 0);
        `);
    
    
    // TABLE: tags

    await queryRunner.createTable(

        new Table({
            name: 'tags',
            columns : [
                {
                    name: 'id',
                    type: 'bigint',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'identity'
                },
                {
                    name: 'name',
                    type: 'text',
                    isNullable: false

                },
            ],
        }),
        true,
    );
    await queryRunner.query(`
        CREATE UNIQUE INDEX idx_tags_name_lower_trim ON tags (LOWER(TRIM(name)));
        `);    
    
    }
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('videos');
    }

    
}
