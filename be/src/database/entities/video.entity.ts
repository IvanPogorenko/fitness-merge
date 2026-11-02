import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChannelEntity } from './channel.entity.js';

export const VIDEO_STATUSES = ['draft', 'published', 'hidden'] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

@Entity({ name: 'videos' })
export class VideoEntity {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'pk_videos' })
  id: string;

  @Column({ name: 'channel_id', type: 'bigint' })
  channelId: string;

  @ManyToOne(() => ChannelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_id', foreignKeyConstraintName: 'fk_videos_channel' })
  channel?: ChannelEntity;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', default: 'draft' })
  status: VideoStatus;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @Column({ name: 'storage_key', type: 'text', unique: true })
  storageKey: string;

  @Column({ name: 'comments_enabled', type: 'boolean', default: true })
  commentsEnabled: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', precision: 3, default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', precision: 3, nullable: true })
  publishedAt: Date | null;
}
