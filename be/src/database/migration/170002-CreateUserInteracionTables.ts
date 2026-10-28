import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserInterationTables1700000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void>{

    //1. Table: Playlists
    await queryRunner.createTable(
        new Table({
            name: 'playlists',
            columns: [
                { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity'},
                { name: 'owner_id', type: 'bigint', isNullable: false} ,
                { name: 'title', type: 'text', isNullable: false }, 
                { name: 'created_at', type: 'timestamptz', isNullable:false, default: 'now()'},
            ],
        }),
        true,
    );

    await queryRunner.createForeignKey(

        'playlists',

        new TableForeignKey({
            columnNames:['owner_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }),
    );
    // 2. Table: Playlist_items (M:N con orden)
    await queryRunner.createTable(
        new Table({
            name: 'playlist_items',
            columns: [ 
                { name: 'playlist_id', type: 'bigint', isPrimary: true, isNullable: false },
                { name: 'video_id', type: 'bigint', isPrimary: true, isNullable: false },
                { name: 'position', type:'integer', isNullable: false },
            ],
            uniques: [{ columnNames: ['playlist_id', 'position']}],
        }),
        true,
     );

     await queryRunner.query(`
        ALTER TABLE playlist_items
        ADD CONSTRAINT check_position_positive CHECK (position > 0);
        `);
     await queryRunner.createForeignKey(
        'playlist_items',
        new TableForeignKey({
            columnNames: ['playlist_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'playlists',
            onDelete: 'CASCADE',
        }),
     );

     await queryRunner.createForeignKey(
        'playlist_items',
        new TableForeignKey({
            columnNames: ['video_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'videos',
            onDelete: 'CASCADE',

        }),
     );

     await queryRunner.createTable(
      new Table({
        name: 'favorites',
        columns: [
          { name: 'user_id', type: 'bigint',isPrimary:true, isNullable: false },
          { name: 'video_id', type: 'bigint', isPrimary:true, isNullable: false },
          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
        ],
     
      }),
      true,
    );
    // FK -> User_id
    await queryRunner.createForeignKey(
        'favorites',
        new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }),
    );

    // FK -> VIDEO_ID
     await queryRunner.createForeignKey(
      'favorites',
      new TableForeignKey({
        columnNames: ['video_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'videos',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso estricto para evitar errores de FK
    await queryRunner.dropTable('favorites');
    await queryRunner.dropTable('playlist_items');
    await queryRunner.dropTable('playlists');
  }

}