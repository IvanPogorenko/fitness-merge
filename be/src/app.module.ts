import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import {VideosModule} from "./video/video.module.js";
import { SearchModule } from './search/search.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({

  imports: [ 
    // global configuration of environment variables 
    ConfigModule.forRoot({
      isGlobal:true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', '1234'),
        database: configService.get<string>('DB_NAME', 'fitness_merge_dev'),
        entities: [],
        synchronize: false,
        logging: ['query', 'error'],
      }),
    }),

    VideosModule, AuthModule, SearchModule], //Connect our video submodule to the backend.
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule {}
