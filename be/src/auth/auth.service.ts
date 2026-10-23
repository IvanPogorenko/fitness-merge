import {BadRequestException, Injectable, UnauthorizedException} from "@nestjs/common";
import {RegisterDto} from './dto/register.dto.js';
import bcrypt from 'bcryptjs';
import {JwtService} from '@nestjs/jwt';
import {UserModel} from "./models/user.model.js";
import {users} from "../mockData/users.mock.js";
import {Provider} from "./enums/providedr.enum.js";
import {LoginDto} from "./dto/login.dto.js";
import {UserResponseModel} from "./models/user-response.model.js";
import axios from 'axios';

@Injectable()
export class AuthService {
    private readonly users: UserModel[] = users; //сохраняем данных

    constructor(
        private readonly jwtService: JwtService,
    ) {}

    async register(registerDto: RegisterDto){
        //мы деструктурируем свойства DTO
        const {email, password, name} = registerDto;
        //мы ищем повторных пользователей
        const userExists = this.users.find((user)=> user.email === email);
        //Если он найдет обькет, мы прервем
        if(userExists){
            throw new BadRequestException('пользователь уже зарегистрован');
        }
        //Definimos el factor de coste (saltRounds)
        const saltRounds = 10;
        //Генерируем криптографический хэш пароля
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        //создаем новый обьект сущности 'User'
        const newUser = {
            id: (this.users.length + 1),
            name,
            email,
            provider: Provider.LOCAL,
            password: hashedPassword, //saved encript password
        };

        this.users.push(newUser);

        const {password: _, ...result } = newUser;

        return result;

    }

    async login(
        loginDto: LoginDto,
    ) {
        const {
            email,
            password,
        } = loginDto;

        const user = users.find(
            (user) => user.email === email,
        );

        if (!user) {
            throw new UnauthorizedException(
                'Неверный email или пароль',
            );
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password,
            );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Неверный email или пароль',
            );
        }

        return this.createAuthResponse(user);
    }

    findById(id: number): UserModel {
        const user = users.find(
            (user) => user.id === id,
        );

        if (!user) {
            throw new UnauthorizedException(
                'Пользователь не найден',
            );
        }

        return user;
    }

    async findOrCreateYandexUser(
        yandexUser: {
            id: string;
            email: string;
            name: string;
        },
    ) {
        let user = users.find(
            (item) =>
                item.yandexId === yandexUser.id,
        );

        if (!user) {
            user = users.find(
                (item) =>
                    item.email === yandexUser.email,
            );
        }

        if (!user) {
            user = {
                id: users.length + 1,
                name: yandexUser.name,
                email: yandexUser.email,
                password: '',
                provider: Provider.LOCAL,
                yandexId: yandexUser.id,
            };

            users.push(user);
        }

        return this.createAuthResponse(user);
    }

    private async createAuthResponse(
        user: UserModel,
    ) {
        const payload = {
            sub: user.id,
            email: user.email,
        };

        const accessToken =
            await this.jwtService.signAsync(
                payload,
            );

        return {
            accessToken,
            user: this.toUserResponse(user),
        };
    }

    private toUserResponse(
        user: UserModel,
    ): UserResponseModel {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            provider: user.provider,
        };
    }

    getYandexAuthUrl(): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id:
                process.env.YANDEX_CLIENT_ID!,
            redirect_uri:
                process.env.YANDEX_REDIRECT_URI!,
        });

        return `https://oauth.yandex.ru/authorize?${params.toString()}`;
    }

    async yandexCallback(code: string) {
        if (!code) {
            throw new BadRequestException(
                'Authorization code не передан',
            );
        }

        const tokenResponse =
            await axios.post(
                'https://oauth.yandex.ru/token',
                new URLSearchParams({
                    grant_type:
                        'authorization_code',

                    code,

                    client_id:
                        process.env.YANDEX_CLIENT_ID!,

                    client_secret:
                        process.env.YANDEX_CLIENT_SECRET!,
                }).toString(),
                {
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded',
                    },
                },
            );

        const yandexAccessToken =
            tokenResponse.data.access_token;

        const userResponse =
            await axios.get(
                'https://login.yandex.ru/info',
                {
                    params: {
                        format: 'json',
                    },

                    headers: {
                        Authorization:
                            `OAuth ${yandexAccessToken}`,
                    },
                },
            );

        const yandexUser =
            userResponse.data;

        return this.findOrCreateYandexUser({
            id: String(yandexUser.id),

            email:
            yandexUser.default_email,

            name:
                yandexUser.real_name ??
                yandexUser.display_name ??
                yandexUser.login,
        });
    }
}