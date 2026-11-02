import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { VideoEntity } from '../database/entities/index.js';

export class TagResponse {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: 'cardio' }) name: string;
}

export class ChannelSummaryResponse {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: 'Canal de Ana' }) title: string;
  @ApiProperty({ example: '1' }) ownerId: string;
  @ApiProperty({ example: 'Usuario 1' }) ownerName: string;
}

// Контракт ответа: bigint — десятичной строкой, даты — ISO 8601 в UTC (суффикс Z)
export class VideoResponse {
  @ApiProperty({ example: '42' }) id: string;
  @ApiProperty({ example: 'Утренняя зарядка' }) title: string;
  @ApiProperty({ example: 'Комплекс упражнений', nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: ['draft', 'published', 'hidden'] }) status: string;
  @ApiProperty({ example: '15000000' }) sizeBytes: string;
  @ApiProperty({ example: true }) commentsEnabled: boolean;
  @ApiProperty({ example: '2026-11-01T10:00:00.000Z' }) createdAt: string;
  @ApiProperty({ example: '2026-11-01T10:05:00.000Z', nullable: true, type: String }) publishedAt: string | null;
  @ApiProperty({ type: ChannelSummaryResponse }) channel: ChannelSummaryResponse;
  @ApiProperty({ type: [TagResponse] }) tags: TagResponse[];
}

export class VideoPageResponse {
  @ApiProperty({ type: [VideoResponse] }) items: VideoResponse[];
  @ApiPropertyOptional({ nullable: true, type: String, description: 'null — страниц больше нет' }) nextCursor: string | null;
}

export class FavoriteVideoResponse extends VideoResponse {
  @ApiProperty({ example: '2026-11-01T10:10:00.000Z' }) favoritedAt: string;
}

export function toVideoResponse(video: VideoEntity, tags: TagResponse[]): VideoResponse {
  const channel = video.channel!;
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    status: video.status,
    sizeBytes: video.sizeBytes,
    commentsEnabled: video.commentsEnabled,
    createdAt: video.createdAt.toISOString(),
    publishedAt: video.publishedAt ? video.publishedAt.toISOString() : null,
    channel: { id: channel.id, title: channel.title, ownerId: channel.ownerId, ownerName: channel.owner!.displayName },
    tags,
  };
}
