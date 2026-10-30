import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyDto } from './dto/verify.dto.js';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../common/decorators/user.decorator.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private config: ConfigService) { }

    @Public()
    @Throttle({
        default: {
            ttl: 600_000,
            limit: 3,
            getTracker: (req) => {
                const phone = req.body?.phone;

                return typeof phone === 'string' && phone.trim()
                    ? phone.trim()
                    : req.ip;
            },
        },
        second: {
            ttl: 3600_000,
            limit: 20
        }
    })
    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto)
    }


    @Throttle({
        second: {
            ttl: 300_000,
            limit: 5,
            getTracker: (req) => {
                const phone = req.body?.phone;

                return typeof phone === 'string' && phone.trim()
                    ? phone.trim()
                    : req.ip;
            },
        }
    })
    @Public()
    @Post('verify')
    async verify(@Body() verifyDto: VerifyDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken } = await this.authService.verify(verifyDto)

        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'lax',
            maxAge: 10 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'lax',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });

        return {
            success: true
        }
    }

    @Throttle({
        default: {
            ttl: 600_000,
            limit: 10
        }
    })
    @Public()
    @UseGuards(AuthGuard("jwt-refresh"))
    @Post('refresh')
    async refresh(@User('refreshToken') rt: string, @User('id') userId: string, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken } = await this.authService.refresh(userId, rt)
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'lax',
            maxAge: 10 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'lax' : 'lax',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });
        return {
            success: true
        }
    }

    @Post('logout')
    logout(@User("id") userId: string) {
        return this.authService.logout(userId)
    }
}
