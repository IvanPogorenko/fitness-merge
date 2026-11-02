import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { VideoEntity } from '../database/entities/index.js';
import { isPgError, PG } from '../common/pg-error.js';
import { decodeCursor, encodeCursor } from './catalog-cursor.js';
import type { CreateVideoDto } from './dto/create-video.dto.js';
import type { ListVideosQuery } from './dto/list-videos.query.js';
import type { UpdateVideoDto } from './dto/update-video.dto.js';
import type { TargetStatus } from './dto/update-video-status.dto.js';
import { toVideoResponse, VideoPageResponse, VideoResponse } from './video.response.js';
import { VideosRepository } from './videos.repository.js';

const DEFAULT_PAGE_SIZE = 20;

export class QuotaExceededError extends ConflictException {
  constructor() {
    super('Channel quota exceeded');
  }
}

@Injectable()
export class VideosService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly videos: VideosRepository,
  ) {}

  // Атомарное создание: резерв квоты, videos и video_tags подтверждаются вместе или не сохраняются вовсе
  async create(userId: string, dto: CreateVideoDto): Promise<VideoResponse> {
    const tagIds = dto.tagIds ?? [];

    // Предварительное чтение только выбирает ответ API (400/403/409); лимит защищает условный UPDATE
    const channel = await this.videos.findChannel(dto.channelId);
    if (!channel) throw new BadRequestException('Unknown channel id');
    if (channel.ownerId !== userId) throw new ForbiddenException('Channel belongs to another user');
    if ((await this.videos.countExistingTags(tagIds)) !== tagIds.length) throw new BadRequestException('Unknown tag id');

    let videoId: string;
    try {
      videoId = await this.dataSource.transaction(async (manager) => {
        const reserved = await this.videos.reserveQuota(manager, dto.channelId, userId, dto.sizeBytes);
        if (!reserved) {
          // Владение проверено выше и через API не меняется, значит не хватило квоты
          throw new QuotaExceededError();
        }
        const id = await this.videos.insertVideo(manager, {
          channelId: dto.channelId,
          title: dto.title,
          description: dto.description ?? null,
          sizeBytes: dto.sizeBytes,
          storageKey: `videos/${dto.channelId}/${randomUUID()}`,
        });
        await this.videos.linkTags(manager, id, tagIds);
        return id;
      });
    } catch (error) {
      // Тег мог исчезнуть между проверкой и вставкой: транзакция уже откатилась, это ошибка входа
      if (isPgError(error, PG.FOREIGN_KEY_VIOLATION, 'fk_video_tags_tag')) throw new BadRequestException('Unknown tag id');
      if (isPgError(error, PG.CHECK_VIOLATION, 'chk_channels_used_bytes_within_quota')) throw new QuotaExceededError();
      throw error;
    }

    return this.getCard(videoId, userId);
  }

  async listCatalog(query: ListVideosQuery): Promise<VideoPageResponse> {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;
    const rows = await this.videos.findCatalogPage({
      q: query.q || undefined,
      channelId: query.channelId,
      cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
      limit,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: await this.withTags(page),
      nextCursor: rows.length > limit && last ? encodeCursor({ publishedAt: last.publishedAt!.toISOString(), id: last.id }) : null,
    };
  }

  // published видна всем; draft и hidden — только владельцу канала, остальным 404
  async getCard(videoId: string, userId?: string): Promise<VideoResponse> {
    const video = await this.videos.findWithChannel(videoId);
    if (!video || (video.status !== 'published' && video.channel!.ownerId !== userId)) {
      throw new NotFoundException('Video not found');
    }
    const [card] = await this.withTags([video]);
    return card;
  }

  async updateText(videoId: string, userId: string, dto: UpdateVideoDto): Promise<VideoResponse> {
    if (dto.title === undefined && dto.description === undefined) {
      throw new BadRequestException('Nothing to update: pass title and/or description');
    }
    await this.loadOwned(videoId, userId);
    await this.videos.updateText(videoId, { title: dto.title, description: dto.description });
    return this.getCard(videoId, userId);
  }

  // draft/hidden -> published, published -> hidden; повтор текущего статуса — безопасный no-op
  async changeStatus(videoId: string, userId: string, target: TargetStatus): Promise<VideoResponse> {
    const video = await this.loadOwned(videoId, userId);
    if (video.status !== target) {
      if (video.status === 'draft' && target === 'hidden') {
        throw new ConflictException('A draft must be published before it can be hidden');
      }
      const changed = await this.videos.changeStatus(videoId, video.status, target);
      if (!changed) throw new ConflictException('Video status was changed concurrently, retry');
    }
    return this.getCard(videoId, userId);
  }

  private async loadOwned(videoId: string, userId: string): Promise<VideoEntity> {
    const video = await this.videos.findWithChannel(videoId);
    if (!video) throw new NotFoundException('Video not found');
    if (video.channel!.ownerId !== userId) throw new ForbiddenException('Video belongs to another user');
    return video;
  }

  async withTags(videos: VideoEntity[]): Promise<VideoResponse[]> {
    const tags = await this.videos.findTagsByVideoIds(videos.map((v) => v.id));
    return videos.map((video) => toVideoResponse(video, tags.get(video.id) ?? []));
  }
}
