import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import {JwtModule} from "@nestjs/jwt";
import {PassportModule} from "@nestjs/passport";
import {jwtConstants} from "./jwt/constants.js";
import {JwtStrategy} from "./jwt/jwt-strategy.js";

// Декаратор @Module обьединяет части контекста футентификаций
// the module decorator group the pieces of the  autentication context  
@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,

            signOptions: {
                expiresIn: '1h',
            },
        }),
    ],
    controllers: [
        AuthController,
    ],
    providers: [
        AuthService,
        JwtStrategy,
    ],
    exports: [
        AuthService,
    ],
})
export class AuthModule {}