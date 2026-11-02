import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';

@Entity({ name: 'channels' })
export class ChannelEntity {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'pk_channels' })
  id: string;

  @Column({ name: 'owner_id', type: 'bigint' })
  ownerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'fk_channels_owner' })
  owner?: UserEntity;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'quota_bytes', type: 'bigint' })
  quotaBytes: string;

  // Сохраненный итог: меняется только транзакционным алгоритмом создания видео
  @Column({ name: 'used_bytes', type: 'bigint', default: 0 })
  usedBytes: string;
}
