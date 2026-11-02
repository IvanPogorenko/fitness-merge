import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FavoriteEntity } from '../database/entities/index.js';
import { FavoriteVideoResponse } from './video.response.js';
import { VideosService } from './videos.service.js';

const DEFAULT_FAVORITES_LIMIT = 50;

@Injectable()
export class FavoritesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly videos: VideosService,
  ) {}

  // Идемпотентное добавление одной командой: повтор и гонка двух запросов оставляют одну связь
  // (PK (user_id, video_id) + ON CONFLICT DO NOTHING). Доступно только published-видео.
  async add(userId: string, videoId: string): Promise<void> {
    const [row]: Array<{ available: boolean }> = await this.dataSource.query(
      `WITH target AS (
         SELECT id FROM videos WHERE id = $2 AND status = 'published'
       ), inserted AS (
         INSERT INTO favorites (user_id, video_id)
         SELECT $1, id FROM target
         ON CONFLICT ON CONSTRAINT pk_favorites DO NOTHING
       )
       SELECT EXISTS (SELECT 1 FROM target) AS available`,
      [userId, videoId],
    );
    if (!row.available) throw new NotFoundException('Video not found');
  }

  // Удаляется только своя связь; повторное удаление тоже успешно
  async remove(userId: string, videoId: string): Promise<void> {
    await this.dataSource.getRepository(FavoriteEntity).delete({ userId, videoId });
  }

  // Ровно два SQL независимо от числа записей: страница избранного и пакетная загрузка тегов
  async list(userId: string, limit = DEFAULT_FAVORITES_LIMIT): Promise<FavoriteVideoResponse[]> {
    const favorites = await this.dataSource
      .getRepository(FavoriteEntity)
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.video', 'v')
      .innerJoinAndSelect('v.channel', 'c')
      .innerJoinAndSelect('c.owner', 'u')
      .where('f.user_id = :userId', { userId })
      .andWhere(`v.status = 'published'`)
      .orderBy('f.created_at', 'DESC')
      .addOrderBy('f.video_id', 'DESC')
      .limit(limit)
      .getMany();
    const cards = await this.videos.withTags(favorites.map((f) => f.video!));
    return cards.map((card, i) => ({ ...card, favoritedAt: favorites[i].createdAt.toISOString() }));
  }
}
