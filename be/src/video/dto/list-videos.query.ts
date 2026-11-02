import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsPositiveBigint, Trim } from '../../common/validation.js';

export class ListVideosQuery {
  @ApiPropertyOptional({ description: 'Часть названия. Символы % и _ ищутся буквально, а не как шаблон' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsPositiveBigint()
  channelId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Значение nextCursor предыдущей страницы' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;
}

export class ListFavoritesQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
