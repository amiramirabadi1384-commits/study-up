import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { Payload } from '../types/payload.type.js';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt'){
    constructor(config: ConfigService){
        super({
            jwtFromRequest: (req: Request) => {
                return req.cookies.accessToken
            },
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("JWT_SECRET")
        })
    }

    validate(payload: Payload){
        return payload;
    }
}