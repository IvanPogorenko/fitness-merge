import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service.js';
import {
    ExtractJwt,
    Strategy,
} from 'passport-jwt';
import {jwtConstants} from "./constants.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
) {
    constructor(
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest:
                ExtractJwt.fromAuthHeaderAsBearerToken(),

            ignoreExpiration: false,

            secretOrKey:
            jwtConstants.secret,
        });
    }

    async validate(payload: {
        sub: number;
        email: string;
    }) {
        return this.authService.findById(
            payload.sub,
        );
    }
}