import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt'
import { VerifyDto } from './dto/verify.dto.js';
import { Role } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private jwtService: JwtService
    ){}

    async login(loginDto: LoginDto){
        if(await this.cacheManager.get(this.getCoolDownKey(loginDto.phone))){
            throw new BadRequestException("لطفا تا تلاش دوباره کمی منتظر بمانید.")
        }

        const user = await this.prisma.user.upsert({
            where: {
                phone: loginDto.phone
            },
            create: {
                phone: loginDto.phone
            },
            update: {},
            select: {
                phone: true
            }
        })

        const code = randomInt(100000, 1000000).toString()
        if (process.env.NODE_ENV !== 'production') {
            console.log('[code]:', code)
        }
        const hashed = await bcrypt.hash(
            code,
            12
        );

        await Promise.all([
            this.cacheManager.set(this.getKey(loginDto.phone), hashed, 5*60*1000),
            this.cacheManager.set(this.getCoolDownKey(loginDto.phone), '1', 60*1000),
            this.cacheManager.del(this.getAttemptsKey(loginDto.phone))
        ])

        return user
    }

    async verify(verifyDto:VerifyDto){
        const hashed = await this.cacheManager.get<string>(this.getKey(verifyDto.phone));
        if(!hashed){
            throw new BadRequestException("انقضای کد به پایان رسیده است.")
        }

        // brute-force protection: 5 wrong guesses invalidate the code
        const attempts = (await this.cacheManager.get<number>(this.getAttemptsKey(verifyDto.phone))) ?? 0
        if(attempts >= 5){
            await this.cacheManager.del(this.getKey(verifyDto.phone))
            throw new BadRequestException("تعداد تلاش های ناموفق زیاد است. لطفا کد جدید دریافت کنید.")
        }

        if(await bcrypt.compare(verifyDto.code, hashed)){
            const user = await this.prisma.user.findUnique({
                where: {
                    phone: verifyDto.phone
                }
            })
            if(!user){
                throw new NotFoundException("شماره در سیستم ثبت نشده است.");
            }

            const tokens = await this.genTokens(user.id, user.phone, user.role)

            await this.prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    refreshToken: await bcrypt.hash(tokens.refreshToken, 12)
                }
            })

            // one-time code: it must not be replayable
            await Promise.all([
                this.cacheManager.del(this.getKey(verifyDto.phone)),
                this.cacheManager.del(this.getAttemptsKey(verifyDto.phone)),
            ])

            return tokens
        }

        await this.cacheManager.set(this.getAttemptsKey(verifyDto.phone), attempts + 1, 5*60*1000)

        throw new BadRequestException("کد وارده اشتباه است.")
    }

    async refresh(userId:string, rt: string){
        const user = await this.prisma.user.findUnique({
            where: {id: userId},
            select: {
                phone: true,
                refreshToken: true,
                role: true,
                id: true
            }
        })
        if(!user || !user.refreshToken || !await bcrypt.compare(rt, user.refreshToken)){
            throw new UnauthorizedException()
        }

        const tokens = await this.genTokens(user.id, user.phone, user.role)

        await this.prisma.user.update({
            where: {id: user.id},
            data: {refreshToken: await bcrypt.hash(tokens.refreshToken, 12)}
        })

        return tokens
    }

    async logout(userId: string){
        await this.prisma.user.update({
            where: {id: userId},
            data:{refreshToken: null}
        })
        return {
            success: true
        }
    }

    private getKey(phone: string){
        return `otp:${phone}`
    }
    private getAttemptsKey(phone: string){
        return `otp-attempts:${phone}`
    }
    private getCoolDownKey(phone: string){
        return `otp-cooldown:${phone}`
    }

    private async genTokens(id:string, phone: string, role: Role){
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.sign({id, phone, role}, {expiresIn: '15m', secret: process.env.JWT_SECRET}),
            this.jwtService.sign({id, phone, role}, {expiresIn: '10d', secret: process.env.JWT_REFRESH_SECRET})
        ])
        return {accessToken, refreshToken}
    }
}
