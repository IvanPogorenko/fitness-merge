//Импортируем декораторов путь  HTTP
import {Body, Controller, Get, Post, Query, Res} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import {ApiOkResponse, ApiOperation, ApiTags} from "@nestjs/swagger";
import {UserResponseModel} from "./models/user-response.model.js";
import {AuthResponseModel} from "./models/auth-response.model.js";
import {LoginDto} from "./dto/login.dto.js";
import type { Response } from 'express';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    @Post('register')
    @ApiOperation({
        summary: 'Регистрация пользователя',
    })
    @ApiOkResponse({
        type: UserResponseModel,
    })
    async register(
        @Body() registerDto: RegisterDto,
    ) {
        return this.authService.register(
            registerDto,
        );
    }

    @Post('login')
    @ApiOperation({
        summary: 'Авторизация пользователя',
    })
    @ApiOkResponse({
        type: AuthResponseModel,
    })
    async login(
        @Body() loginDto: LoginDto,
    ) {
        return this.authService.login(
            loginDto,
        );
    }

    @Get('yandex')
    @ApiOperation({
        summary: 'Авторизация через Яндекс',
    })
    yandexLogin(
        @Res() response: Response,
    ) {
        const url =
            this.authService.getYandexAuthUrl();

        return response.redirect(url);
    }

    @Get('yandex/callback')
    @ApiOperation({
        summary:
            'Callback авторизации через Яндекс',
    })
    async yandexCallback(
        @Query('code') code: string,
    ) {
        return this.authService.yandexCallback(
            code,
        );
    }
}