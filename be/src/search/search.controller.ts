import {Controller, Get, Query} from '@nestjs/common';
import {SearchService} from "./search.service.js";
import {ApiOkResponse, ApiOperation} from "@nestjs/swagger";
import {SearchVideoResponseDto} from "./models/search-video.model.js";
import {SearchVideoDto} from "./dto/search-video.dto.js";

@Controller('search')
export class SearchController {
    constructor(
        private readonly videoService: SearchService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Поиск видео',
        description:
            'Выполняет серверный поиск видео по названию, теме и описанию с поддержкой фильтрации, сортировки и пагинации.',
    })
    @ApiOkResponse({
        description: 'Результаты поиска видео.',
        type: SearchVideoResponseDto,
    })
    search(
        @Query() searchDto: SearchVideoDto,
    ): SearchVideoResponseDto {
        return this.videoService.search(searchDto);
    }
}
