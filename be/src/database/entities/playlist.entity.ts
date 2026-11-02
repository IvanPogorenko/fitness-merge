import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';

// Плейлисты в обязательной части проверяются SQL и ограничениями; API для них не реализуется
@Entity({ name: 'playlists' })
export class PlaylistEntity {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'pk_playlists' })
  id: string;

  @Column({ name: 'owner_id', type: 'bigint' })
  ownerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'fk_playlists_owner' })
  owner?: UserEntity;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
