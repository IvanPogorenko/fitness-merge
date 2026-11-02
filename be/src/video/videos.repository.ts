import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { ChannelEntity, TagEntity, VideoEntity, VideoTagEntity } from '../database/entities/index.js';
import type { CatalogCursor } from './catalog-cursor.js';
import type { TagResponse } from './video.response.js';

export interface NewVideo {
  channelId: string;
  title: string;
  description: string | null;
  sizeBytes: string;
  storageKey: string;
}

// Условный UPDATE резерва квоты: $1 — размер, $2 — канал, $3 — владелец из контекста запроса
export const RESERVE_QUOTA_SQL = `UPDATE channels
    SET used_bytes = used_bytes + $1::bigint
  WHERE id = $2
    AND owner_id = $3
    AND $1::bigint > 0
    AND quota_bytes - used_bytes >= $1::bigint
  RETURNING id`;

export interface CatalogFilter {
  q?: string;
  channelId?: string;
  cursor?: CatalogCursor;
  limit: number;
}

// Слой доступа к данным: TypeORM QueryBuilder для чтения, параметризованный SQL для условного UPDATE.
// Методы с параметром manager выполняются внутри транзакции вызывающего кода.
@Injectable()
export class VideosRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private withChannelAndOwner(manager: EntityManager = this.dataSource.manager): SelectQueryBuilder<VideoEntity> {
    // many-to-one соединения не размножают строки, поэтому LIMIT применяется к видео
    return manager.getRepository(VideoEntity).createQueryBuilder('v').innerJoinAndSelect('v.channel', 'c').innerJoinAndSelect('c.owner', 'u');
  }

  findCatalogPage(filter: CatalogFilter): Promise<VideoEntity[]> {
    const query = this.withChannelAndOwner().where(`v.status = 'published'`);
    if (filter.channelId) {
      query.andWhere('v.channel_id = :channelId', { channelId: filter.channelId });
    }
    if (filter.q) {
      // Ввод пользователя ищется буквально: \, % и _ экранируются
      query.andWhere(`v.title ILIKE :pattern ESCAPE '\\'`, { pattern: `%${filter.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%` });
    }
    if (filter.cursor) {
      query.andWhere('(v.published_at, v.id) < (CAST(:cursorAt AS timestamptz), CAST(:cursorId AS bigint))', {
        cursorAt: filter.cursor.publishedAt,
        cursorId: filter.cursor.id,
      });
    }
    // Та же пара (published_at, id) в WHERE и ORDER BY; на один больше, чтобы узнать о следующей странице
    return query.orderBy('v.published_at', 'DESC').addOrderBy('v.id', 'DESC').limit(filter.limit + 1).getMany();
  }

  findWithChannel(videoId: string): Promise<VideoEntity | null> {
    return this.withChannelAndOwner().where('v.id = :videoId', { videoId }).getOne();
  }

  // Теги для всей страницы одним запросом: число SQL не зависит от размера страницы (нет N+1)
  async findTagsByVideoIds(videoIds: string[]): Promise<Map<string, TagResponse[]>> {
    const result = new Map<string, TagResponse[]>(videoIds.map((id) => [id, []]));
    if (videoIds.length === 0) return result;
    const rows: Array<{ video_id: string; id: string; name: string }> = await this.dataSource
      .getRepository(VideoTagEntity)
      .createQueryBuilder('vt')
      .innerJoin(TagEntity, 't', 't.id = vt.tag_id')
      .select(['vt.video_id AS video_id', 't.id AS id', 't.name AS name'])
      .where('vt.video_id IN (:...videoIds)', { videoIds })
      .orderBy('vt.video_id')
      .addOrderBy('t.name')
      .getRawMany();
    for (const row of rows) {
      result.get(row.video_id)?.push({ id: row.id, name: row.name });
    }
    return result;
  }

  findChannel(channelId: string, manager: EntityManager = this.dataSource.manager): Promise<ChannelEntity | null> {
    return manager.getRepository(ChannelEntity).findOneBy({ id: channelId });
  }

  async countExistingTags(tagIds: string[]): Promise<number> {
    if (tagIds.length === 0) return 0;
    return this.dataSource.getRepository(TagEntity).createQueryBuilder('t').where('t.id IN (:...tagIds)', { tagIds }).getCount();
  }

  // Резервирование квоты одним условным UPDATE. Строка канала блокируется до конца транзакции,
  // поэтому вторая конкурирующая транзакция ждет и перепроверяет условие уже по новому used_bytes.
  async reserveQuota(manager: EntityManager, channelId: string, ownerId: string, sizeBytes: string): Promise<boolean> {
    // TypeORM для UPDATE ... RETURNING без structured-режима возвращает [rows, rowCount]; берем явную форму
    const result = await manager.queryRunner!.query(RESERVE_QUOTA_SQL, [sizeBytes, channelId, ownerId], true);
    return result.records.length === 1;
  }

  async insertVideo(manager: EntityManager, video: NewVideo): Promise<string> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(VideoEntity)
      .values({ ...video, status: 'draft' })
      .returning(['id'])
      .execute();
    return String(result.raw[0].id);
  }

  async linkTags(manager: EntityManager, videoId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    await manager.query(`INSERT INTO video_tags (video_id, tag_id) SELECT $1::bigint, unnest($2::bigint[])`, [videoId, tagIds]);
  }

  updateText(videoId: string, changes: { title?: string; description?: string | null }): Promise<unknown> {
    return this.dataSource.getRepository(VideoEntity).update({ id: videoId }, changes);
  }

  // Смена статуса только из ожидаемого текущего: параллельная смена не перезапишется молча.
  // Первоначальный published_at сохраняется при повторной публикации — он задает порядок каталога.
  async changeStatus(videoId: string, from: string, to: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE videos
          SET status = $3,
              published_at = CASE WHEN $3 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END
        WHERE id = $1 AND status = $2`,
      [videoId, from, to],
    );
    // Для UPDATE TypeORM возвращает [rows, rowCount]
    return (result as [unknown[], number])[1] === 1;
  }
}
