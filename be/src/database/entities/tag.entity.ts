import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tags' })
export class TagEntity {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS', primaryKeyConstraintName: 'pk_tags' })
  id: string;

  // Уникальность после lower(btrim(name)) обеспечивает индекс uq_tags_name_normalized
  @Column({ type: 'text' })
  name: string;
}
