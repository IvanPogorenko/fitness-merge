import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, DEMO_USER_HEADER, OptionalUserGuard, RequireUserGuard, type RequestUser } from '../common/demo-auth.js';
import { ParseBigintIdPipe } from '../common/validation.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { ListVideosQuery } from './dto/list-videos.query.js';
import { UpdateVideoStatusDto } from './dto/update-video-status.dto.js';
import { UpdateVideoDto } from './dto/update-video.dto.js';
import { VideoPageResponse, VideoResponse } from './video.response.js';
import { VideosService } from './videos.service.js';

// Контроллер принимает HTTP-вход и проверяет его, сценарий выполняет сервис
@ApiTags('videos')
@ApiHeader({ name: DEMO_USER_HEADER, required: false, description: 'Учебный demo-режим: id пользователя из seed' })
@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Post()
  @UseGuards(RequireUserGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201, type: VideoResponse, description: 'Черновик создан, квота зарезервирована' })
  @ApiResponse({ status: 400, description: 'Некорректный вход, неизвестный канал или тег' })
  @ApiResponse({ status: 403, description: 'Канал принадлежит другому пользователю' })
  @ApiResponse({ status: 409, description: 'Недостаточно квоты канала' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateVideoDto): Promise<VideoResponse> {
    return this.videos.create(user.id, dto);
  }

  @Get()
  @ApiResponse({ status: 200, type: VideoPageResponse, description: 'Публичный каталог: только published' })
  list(@Query() query: ListVideosQuery): Promise<VideoPageResponse> {
    return this.videos.listCatalog(query);
  }

  @Get(':id')
  @UseGuards(OptionalUserGuard)
  @ApiResponse({ status: 200, type: VideoResponse })
  @ApiResponse({ status: 404, description: 'Нет видео или оно недоступно этому пользователю' })
  findOne(@Param('id', ParseBigintIdPipe) id: string, @CurrentUser() user?: RequestUser): Promise<VideoResponse> {
    return this.videos.getCard(id, user?.id);
  }

  @Patch(':id')
  @UseGuards(RequireUserGuard)
  @ApiResponse({ status: 200, type: VideoResponse })
  @ApiResponse({ status: 403, description: 'Чужое видео' })
  update(@Param('id', ParseBigintIdPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateVideoDto): Promise<VideoResponse> {
    return this.videos.updateText(id, user.id, dto);
  }

  @Patch(':id/status')
  @UseGuards(RequireUserGuard)
  @ApiResponse({ status: 200, type: VideoResponse })
  @ApiResponse({ status: 403, description: 'Чужое видео' })
  @ApiResponse({ status: 409, description: 'Недопустимый переход статуса' })
  changeStatus(@Param('id', ParseBigintIdPipe) id: string, @CurrentUser() user: RequestUser, @Body() dto: UpdateVideoStatusDto): Promise<VideoResponse> {
    return this.videos.changeStatus(id, user.id, dto.status);
  }
}
