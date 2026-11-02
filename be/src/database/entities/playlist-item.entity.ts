import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { PlaylistEntity } from './playlist.entity.js';
import { VideoEntity } from './video.entity.js';

@Entity({ name: 'playlist_items' })
@Unique('uq_playlist_items_position', ['playlistId', 'position'])
export class PlaylistItemEntity {
  @PrimaryColumn({ name: 'playlist_id', type: 'bigint', primaryKeyConstraintName: 'pk_playlist_items' })
  playlistId: string;

  @PrimaryColumn({ name: 'video_id', type: 'bigint', primaryKeyConstraintName: 'pk_playlist_items' })
  videoId: string;

  // Позиция — свойство связи «видео в конкретном плейлисте»
  @Column({ type: 'integer' })
  position: number;

  @ManyToOne(() => PlaylistEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id', foreignKeyConstraintName: 'fk_playlist_items_playlist' })
  playlist?: PlaylistEntity;

  @ManyToOne(() => VideoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id', foreignKeyConstraintName: 'fk_playlist_items_video' })
  video?: VideoEntity;
}
