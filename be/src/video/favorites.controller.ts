import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, DEMO_USER_HEADER, RequireUserGuard, type RequestUser } from '../common/demo-auth.js';
import { ParseBigintIdPipe } from '../common/validation.js';
import { ListFavoritesQuery } from './dto/list-videos.query.js';
import { FavoritesService } from './favorites.service.js';
import { FavoriteVideoResponse } from './video.response.js';

@ApiTags('favorites')
@ApiHeader({ name: DEMO_USER_HEADER, required: true, description: 'Учебный demo-режим: id пользователя из seed' })
@UseGuards(RequireUserGuard)
@Controller('me/favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Put(':videoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Видео в избранном (повтор оставляет одну связь)' })
  @ApiResponse({ status: 404, description: 'Нет опубликованного видео с таким id' })
  add(@CurrentUser() user: RequestUser, @Param('videoId', ParseBigintIdPipe) videoId: string): Promise<void> {
    return this.favorites.add(user.id, videoId);
  }

  @Delete(':videoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Связи нет (в том числе при повторном удалении)' })
  remove(@CurrentUser() user: RequestUser, @Param('videoId', ParseBigintIdPipe) videoId: string): Promise<void> {
    return this.favorites.remove(user.id, videoId);
  }

  @Get()
  @ApiResponse({ status: 200, type: [FavoriteVideoResponse], description: 'Только доступные published-видео' })
  list(@CurrentUser() user: RequestUser, @Query() query: ListFavoritesQuery): Promise<FavoriteVideoResponse[]> {
    return this.favorites.list(user.id, query.limit);
  }
}
