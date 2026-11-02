import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TagEntity } from './tag.entity.js';
import { VideoEntity } from './video.entity.js';

@Entity({ name: 'video_tags' })
export class VideoTagEntity {
  @PrimaryColumn({ name: 'video_id', type: 'bigint', primaryKeyConstraintName: 'pk_video_tags' })
  videoId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'bigint', primaryKeyConstraintName: 'pk_video_tags' })
  tagId: string;

  @ManyToOne(() => VideoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id', foreignKeyConstraintName: 'fk_video_tags_video' })
  video?: VideoEntity;

  @ManyToOne(() => TagEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id', foreignKeyConstraintName: 'fk_video_tags_tag' })
  tag?: TagEntity;
}
