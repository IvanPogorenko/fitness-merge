import {
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import {Type} from 'class-transformer';

export enum VideoSearchSortBy {
    TITLE = 'title',
    DURATION = 'duration',
    SIZE = 'size',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class SearchVideoDto {
    @ApiPropertyOptional({
        description: 'Поисковый запрос. Ищет по названию, теме и описанию видео.',
        example: 'спина',
    })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({
        description: 'Фильтр по теме видео.',
        example: 'ЛФК',
    })
    @IsOptional()
    @IsString()
    topic?: string;

    @ApiPropertyOptional({
        description: 'Номер страницы.',
        example: 1,
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({
        description: 'Количество видео на странице.',
        example: 10,
        default: 10,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 10;

    @ApiPropertyOptional({
        description: 'Поле, по которому выполняется сортировка.',
        enum: VideoSearchSortBy,
        example: VideoSearchSortBy.TITLE,
    })
    @IsOptional()
    @IsEnum(VideoSearchSortBy)
    sortBy?: VideoSearchSortBy;

    @ApiPropertyOptional({
        description: 'Направление сортировки.',
        enum: SortOrder,
        example: SortOrder.ASC,
        default: SortOrder.ASC,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    order: SortOrder = SortOrder.ASC;
}