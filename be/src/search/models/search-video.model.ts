import {
    ApiProperty,
} from '@nestjs/swagger';
import {VideoModel} from "../../video/models/video.interface.js";

export class SearchVideoResponseDto {
    @ApiProperty({
        description: 'Видео, соответствующие поисковому запросу.',
        type: [VideoModel],
    })
    data: VideoModel[];

    @ApiProperty({
        example: 15,
        description: 'Общее количество найденных видео до пагинации.',
    })
    total: number;

    @ApiProperty({
        example: 1,
        description: 'Текущая страница.',
    })
    page: number;

    @ApiProperty({
        example: 10,
        description: 'Количество видео на странице.',
    })
    limit: number;

    @ApiProperty({
        example: 2,
        description: 'Общее количество страниц.',
    })
    totalPages: number;
}