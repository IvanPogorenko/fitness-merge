import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTables1700000000000 implements MigrationInterface {

    public async up (queryRunner: QueryRunner): Promise<void> {
        // 1. Table 'users'
        await queryRunner.createTable(
            new Table({
                name:'users',
                columns: [
                    { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity' },
                    { name: 'display_name', type: 'text', isNullable: false},
                    { name: 'email', type: 'text', isNullable: false, isUnique: true},
                    { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()'},
                ],
            }),
            true,
        );
        //2. Table 'channels'
         await queryRunner.createTable(
            new Table({
                name: 'channels',
                columns: [
                    { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'identity'},
                    { name: 'owner_id', type: 'bigint', isNullable: false},
                    { name: 'title', type: 'text', isNullable: false },
                    { name: 'quota_bytes', type: 'bigint', isNullable: false },
                    { name: 'used_bytes',  type: 'bigint', isNullable: false, default: '0'},
                ],
            }),
            true,
         );
         //3 key foreing -> user.id (con RESTRICT)
         await queryRunner.createForeignKey(
            'channels',
            new TableForeignKey({
                columnNames: ['owner_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'RESTRICT',
            }),
         );

         await queryRunner.query(`
            ALTER TABLE channels
            ADD CONSTRAINT check_used_bytes_quota CHECK (used_bytes >= 0 AND used_bytes <= quota_bytes),
            ADD CONSTRAINT check_quota_positive CHECK (quota_bytes >= 0);
            );
    }
    public async down(queryRunner:QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('channels');
        if (table){
            const fk = table.foreignKeys.find((f)=> f.columnNames.indexOf('owner_id') !== -1);
            if (fk) await  queryRunner.dropForeignKey('channels', fk);
        }
        await queryRunner.dropTable('channels');
        await queryRunner.dropTable('users');
    }
}