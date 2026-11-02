import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../common/validation.js';

// Меняются только title и description. Размер и канал после создания неизменяемы.
export class UpdateVideoDto {
  @ApiPropertyOptional({ example: 'Утренняя зарядка (обновлено)' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Новое описание', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
