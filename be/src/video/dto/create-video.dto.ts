import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsPositiveBigint, ToBigintString, Trim } from '../../common/validation.js';

// owner_id, status, used_bytes и storage_key в теле не принимаются: лишние поля дают 400 (forbidNonWhitelisted)
export class CreateVideoDto {
  @ApiProperty({ example: '1', description: 'Канал текущего пользователя (bigint десятичной строкой)' })
  @ToBigintString()
  @IsPositiveBigint()
  channelId: string;

  @ApiProperty({ example: 'Утренняя зарядка' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Комплекс упражнений на 15 минут', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiProperty({ example: '15000000', description: 'Зарезервированный размер в байтах (bigint десятичной строкой)' })
  @ToBigintString()
  @IsPositiveBigint()
  sizeBytes: string;

  @ApiPropertyOptional({ example: ['1', '2'], description: 'Существующие теги; повторы запрещены' })
  @IsOptional()
  @ToBigintString()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsPositiveBigint({ each: true })
  tagIds?: string[];
}
