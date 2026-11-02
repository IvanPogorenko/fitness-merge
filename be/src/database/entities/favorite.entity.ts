import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { VideoEntity } from './video.entity.js';

@Entity({ name: 'favorites' })
export class FavoriteEntity {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', primaryKeyConstraintName: 'pk_favorites' })
  userId: string;

  @PrimaryColumn({ name: 'video_id', type: 'bigint', primaryKeyConstraintName: 'pk_favorites' })
  videoId: string;

  @Column({ name: 'created_at', type: 'timestamptz', precision: 3, default: () => 'now()' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_favorites_user' })
  user?: UserEntity;

  @ManyToOne(() => VideoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id', foreignKeyConstraintName: 'fk_favorites_video' })
  video?: VideoEntity;
}
