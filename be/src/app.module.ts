import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import {VideosModule} from "./video/video.module.js";
import { SearchModule } from './search/search.module.js';

@Module({

  imports: [VideosModule, AuthModule, SearchModule], //Connect our video submodule to the backend.
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule {}
