import { MigrationInterface, QueryRunner } from 'typeorm';

type ConstraintType = 'p' | 'f' | 'u' | 'c';

interface ConstraintRename {
  table: string;
  type: ConstraintType;
  columns: string[];
  name: string;
  // Для отката: таблица и столбцы, на которые ссылается FK (нужны стратегии имен TypeORM)
  references?: { table: string; columns: string[] };
}

// Ограничения, созданные миграциями 17000-170002 без явных имен (TypeORM выдал хеш-имена).
// Приложение различает ошибки PostgreSQL по имени ограничения, поэтому имена должны быть стабильными.
const RENAMES: ConstraintRename[] = [
  { table: 'users', type: 'p', columns: ['id'], name: 'pk_users' },
  { table: 'channels', type: 'p', columns: ['id'], name: 'pk_channels' },
  { table: 'channels', type: 'f', columns: ['owner_id'], name: 'fk_channels_owner', references: { table: 'users', columns: ['id'] } },
  { table: 'videos', type: 'p', columns: ['id'], name: 'pk_videos' },
  { table: 'videos', type: 'f', columns: ['channel_id'], name: 'fk_videos_channel', references: { table: 'channels', columns: ['id'] } },
  { table: 'videos', type: 'u', columns: ['storage_key'], name: 'uq_videos_storage_key' },
  { table: 'tags', type: 'p', columns: ['id'], name: 'pk_tags' },
  { table: 'video_tags', type: 'p', columns: ['tag_id', 'video_id'], name: 'pk_video_tags' },
  { table: 'video_tags', type: 'f', columns: ['video_id'], name: 'fk_video_tags_video', references: { table: 'videos', columns: ['id'] } },
  { table: 'video_tags', type: 'f', columns: ['tag_id'], name: 'fk_video_tags_tag', references: { table: 'tags', columns: ['id'] } },
  { table: 'playlists', type: 'p', columns: ['id'], name: 'pk_playlists' },
  { table: 'playlist_items', type: 'p', columns: ['playlist_id', 'video_id'], name: 'pk_playlist_items' },
  { table: 'playlist_items', type: 'u', columns: ['playlist_id', 'position'], name: 'uq_playlist_items_position' },
  { table: 'playlist_items', type: 'f', columns: ['playlist_id'], name: 'fk_playlist_items_playlist', references: { table: 'playlists', columns: ['id'] } },
  { table: 'playlist_items', type: 'f', columns: ['video_id'], name: 'fk_playlist_items_video', references: { table: 'videos', columns: ['id'] } },
  { table: 'favorites', type: 'p', columns: ['user_id', 'video_id'], name: 'pk_favorites' },
  { table: 'favorites', type: 'f', columns: ['user_id'], name: 'fk_favorites_user', references: { table: 'users', columns: ['id'] } },
  { table: 'favorites', type: 'f', columns: ['video_id'], name: 'fk_favorites_video', references: { table: 'videos', columns: ['id'] } },
];

// CHECK-ограничения, которые уже имели имена, приводятся к единому стилю chk_<таблица>_<правило>
const CHECK_RENAMES: Array<{ table: string; from: string; to: string }> = [
  { table: 'channels', from: 'check_used_bytes_quota', to: 'chk_channels_used_bytes_within_quota' },
  { table: 'videos', from: 'check_video_status', to: 'chk_videos_status' },
  { table: 'videos', from: 'check_size_positive', to: 'chk_videos_size_positive' },
  { table: 'playlist_items', from: 'check_position_positive', to: 'chk_playlist_items_position_positive' },
];

async function findConstraint(queryRunner: QueryRunner, table: string, type: ConstraintType, columns: string[]): Promise<string> {
  const rows: Array<{ conname: string }> = await queryRunner.query(
    `SELECT con.conname
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      WHERE ns.nspname = current_schema()
        AND rel.relname = $1
        AND con.contype = $2
        AND (SELECT array_agg(att.attname::text ORDER BY att.attname)
               FROM unnest(con.conkey) AS k(attnum)
               JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum) = $3::text[]`,
    [table, type, [...columns].sort()],
  );
  if (rows.length !== 1) {
    throw new Error(`Expected one constraint ${type} on ${table}(${columns.join(', ')}), found ${rows.length}`);
  }
  return rows[0].conname;
}

function generatedName(queryRunner: QueryRunner, rename: ConstraintRename): string {
  const naming = queryRunner.connection.namingStrategy;
  switch (rename.type) {
    case 'p':
      return naming.primaryKeyName(rename.table, rename.columns);
    case 'u':
      return naming.uniqueConstraintName(rename.table, rename.columns);
    case 'f':
      return naming.foreignKeyName(rename.table, rename.columns, rename.references!.table, rename.references!.columns);
    default:
      throw new Error(`Unsupported constraint type ${rename.type}`);
  }
}

export class HardenConstraints1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Стабильные имена PK, FK и UNIQUE
    for (const rename of RENAMES) {
      const current = await findConstraint(queryRunner, rename.table, rename.type, rename.columns);
      await queryRunner.query(`ALTER TABLE "${rename.table}" RENAME CONSTRAINT "${current}" TO "${rename.name}"`);
    }
    for (const rename of CHECK_RENAMES) {
      await queryRunner.query(`ALTER TABLE "${rename.table}" RENAME CONSTRAINT "${rename.from}" TO "${rename.to}"`);
    }
    await queryRunner.query(`ALTER INDEX idx_tags_name_lower_trim RENAME TO uq_tags_name_normalized`);

    // 2. Email уникален после нормализации: ' Anna@Mail.com ' и 'anna@mail.com' — один адрес
    const emailUnique = await findConstraint(queryRunner, 'users', 'u', ['email']);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT "${emailUnique}"`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_users_email_normalized ON users (lower(btrim(email)))`);

    // 3. Ссылка плейлиста на владельца: RESTRICT вместо CASCADE, чтобы удаление пользователя не стирало его данные молча
    await queryRunner.query(`ALTER TABLE playlists DROP CONSTRAINT "${await findConstraint(queryRunner, 'playlists', 'f', ['owner_id'])}"`);
    await queryRunner.query(
      `ALTER TABLE playlists ADD CONSTRAINT fk_playlists_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT`,
    );

    // 4. Недостающие CHECK
    await queryRunner.query(`
      ALTER TABLE users
        ADD CONSTRAINT chk_users_display_name_not_blank CHECK (btrim(display_name) <> ''),
        ADD CONSTRAINT chk_users_email_not_blank CHECK (btrim(email) <> '')
    `);
    await queryRunner.query(`
      ALTER TABLE channels
        ADD CONSTRAINT chk_channels_quota_non_negative CHECK (quota_bytes >= 0),
        ADD CONSTRAINT chk_channels_title_not_blank CHECK (btrim(title) <> '')
    `);
    await queryRunner.query(`
      ALTER TABLE videos
        ADD CONSTRAINT chk_videos_title_not_blank CHECK (btrim(title) <> ''),
        ADD CONSTRAINT chk_videos_published_has_date CHECK (status <> 'published' OR published_at IS NOT NULL),
        ADD CONSTRAINT chk_videos_draft_never_published CHECK (status <> 'draft' OR published_at IS NULL)
    `);
    await queryRunner.query(`ALTER TABLE tags ADD CONSTRAINT chk_tags_name_not_blank CHECK (btrim(name) <> '')`);
    await queryRunner.query(`ALTER TABLE playlists ADD CONSTRAINT chk_playlists_title_not_blank CHECK (btrim(title) <> '')`);

    // 5. Миллисекундная точность моментов времени: курсор каталога передает published_at через JS Date,
    //    который хранит только миллисекунды. Существующие значения округляются до миллисекунд.
    await queryRunner.query(`
      ALTER TABLE videos
        ALTER COLUMN created_at TYPE timestamptz(3),
        ALTER COLUMN published_at TYPE timestamptz(3)
    `);
    await queryRunner.query(`ALTER TABLE favorites ALTER COLUMN created_at TYPE timestamptz(3)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откат точности не возвращает отброшенные микросекунды
    await queryRunner.query(`ALTER TABLE favorites ALTER COLUMN created_at TYPE timestamptz`);
    await queryRunner.query(`
      ALTER TABLE videos
        ALTER COLUMN created_at TYPE timestamptz,
        ALTER COLUMN published_at TYPE timestamptz
    `);

    await queryRunner.query(`ALTER TABLE playlists DROP CONSTRAINT chk_playlists_title_not_blank`);
    await queryRunner.query(`ALTER TABLE tags DROP CONSTRAINT chk_tags_name_not_blank`);
    await queryRunner.query(`
      ALTER TABLE videos
        DROP CONSTRAINT chk_videos_draft_never_published,
        DROP CONSTRAINT chk_videos_published_has_date,
        DROP CONSTRAINT chk_videos_title_not_blank
    `);
    await queryRunner.query(`
      ALTER TABLE channels
        DROP CONSTRAINT chk_channels_title_not_blank,
        DROP CONSTRAINT chk_channels_quota_non_negative
    `);
    await queryRunner.query(`
      ALTER TABLE users
        DROP CONSTRAINT chk_users_email_not_blank,
        DROP CONSTRAINT chk_users_display_name_not_blank
    `);

    const naming = queryRunner.connection.namingStrategy;
    await queryRunner.query(`ALTER TABLE playlists DROP CONSTRAINT fk_playlists_owner`);
    await queryRunner.query(
      `ALTER TABLE playlists ADD CONSTRAINT "${naming.foreignKeyName('playlists', ['owner_id'], 'users', ['id'])}"
         FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE`,
    );

    await queryRunner.query(`DROP INDEX uq_users_email_normalized`);
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT "${naming.uniqueConstraintName('users', ['email'])}" UNIQUE (email)`);

    await queryRunner.query(`ALTER INDEX uq_tags_name_normalized RENAME TO idx_tags_name_lower_trim`);
    for (const rename of [...CHECK_RENAMES].reverse()) {
      await queryRunner.query(`ALTER TABLE "${rename.table}" RENAME CONSTRAINT "${rename.to}" TO "${rename.from}"`);
    }
    for (const rename of [...RENAMES].reverse()) {
      await queryRunner.query(`ALTER TABLE "${rename.table}" RENAME CONSTRAINT "${rename.name}" TO "${generatedName(queryRunner, rename)}"`);
    }
  }
}
