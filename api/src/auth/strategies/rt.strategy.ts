import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport'
import type { Request } from 'express';
import { Strategy } from 'passport-jwt'
import { Payload } from '../types/payload.type.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh'){
    constructor(config: ConfigService){
        super({
            jwtFromRequest: (req: Request) => {
                return req.cookies.refreshToken
            },
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"),
            passReqToCallback: true
        })
    }

    validate(req: Request, payload: Payload){
        const refreshToken = req.cookies.refreshToken
        
        return {
            ...payload,
            refreshToken
        };
    }
}