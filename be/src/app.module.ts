import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseExceptionFilter } from './common/database-exception.filter.js';
import { DatabaseModule } from './database/database.module.js';
import { VideosModule } from './video/video.module.js';

@Module({
  imports: [
    // Глобальная конфигурация из переменных окружения (.env)
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    VideosModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class AppModule {}
