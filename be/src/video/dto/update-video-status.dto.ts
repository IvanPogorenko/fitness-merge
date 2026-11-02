import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const TARGET_STATUSES = ['published', 'hidden'] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];

export class UpdateVideoStatusDto {
  @ApiProperty({ enum: TARGET_STATUSES, example: 'published' })
  @IsIn(TARGET_STATUSES)
  status: TargetStatus;
}
