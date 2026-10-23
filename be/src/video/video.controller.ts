import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import {
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {VideoService} from "./video.service.js";
import {VideoModel} from "./models/video.interface.js";
import {UpdateVideoDto} from "./dto/update-video.dto.js";
import {ReplaceVideoDto} from "./dto/replace-viceo.dto.js";
import {CreateVideoDto} from "./dto/create-video.dto.js";

@ApiTags('videos')
@Controller('videos')
export class VideoController {
    constructor(
        private readonly videosService: VideoService,
    ) {}

    @Get()
    @ApiResponse({
        status: 200,
        description: 'Get all videos',
        type: [VideoModel],
    })
    findAll(): VideoModel[] {
        return this.videosService.findAll();
    }

    @Get(':id')
    @ApiResponse({
        status: 200,
        description: 'Get video by id',
        type: VideoModel,
    })
    @ApiResponse({
        status: 404,
        description: 'Video not found',
    })
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ): VideoModel {
        return this.videosService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiResponse({
        status: 201,
        description: 'Video created',
        type: VideoModel,
    })
    create(
        @Body() createVideoDto: CreateVideoDto,
    ): VideoModel {
        return this.videosService.create(createVideoDto);
    }

    @Patch(':id')
    @ApiResponse({
        status: 200,
        description: 'Video partially updated',
        type: VideoModel,
    })
    @ApiResponse({
        status: 404,
        description: 'Video not found',
    })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateVideoDto: UpdateVideoDto,
    ): VideoModel {
        return this.videosService.update(id, updateVideoDto);
    }

    @Put(':id')
    @ApiResponse({
        status: 200,
        description: 'Video replaced',
        type: VideoModel,
    })
    @ApiResponse({
        status: 404,
        description: 'Video not found',
    })
    replace(
        @Param('id', ParseIntPipe) id: number,
        @Body() replaceVideoDto: ReplaceVideoDto,
    ): VideoModel {
        return this.videosService.replace(id, replaceVideoDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiResponse({
        status: 204,
        description: 'Video deleted',
    })
    @ApiResponse({
        status: 404,
        description: 'Video not found',
    })
    remove(
        @Param('id', ParseIntPipe) id: number,
    ): void {
        this.videosService.remove(id);
    }
}