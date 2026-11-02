import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';
import { VideosController } from './videos.controller.js';
import { VideosRepository } from './videos.repository.js';
import { VideosService } from './videos.service.js';
import { OptionalUserGuard, RequireUserGuard } from '../common/demo-auth.js';

@Module({
  controllers: [VideosController, FavoritesController],
  providers: [VideosRepository, VideosService, FavoritesService, RequireUserGuard, OptionalUserGuard],
  exports: [VideosService, VideosRepository],
})
export class VideosModule {}
