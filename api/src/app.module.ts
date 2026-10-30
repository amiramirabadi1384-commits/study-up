import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CacheModule } from '@nestjs/cache-manager'
import { createKeyv } from '@keyv/redis';
import { APP_GUARD } from '@nestjs/core';
import { ATGaurd } from './common/gaurds/at.gaurd.js';
import { RoleGaurd } from './common/gaurds/role.gaurd.js';
import { RedisModule } from './redis/redis.module.js';
import { BullModule } from '@nestjs/bullmq'
import { ZarinPalModule } from './zarin-pal/zarin-pal.module.js';
import { CategoryModule } from './category/category.module.js';
import { BankModule } from './bank/bank.module.js';
import { ExamModule } from './exam/exam.module.js';
import { QuestionModule } from './question/question.module.js';
import { PlanModule } from './plan/plan.module.js';
import { CartModule } from './cart/cart.module.js';
import { PkgModule } from './pkg/pkg.module.js';
import { DaysModule } from './days/days.module.js';
import { AccessModule } from './access/access.module.js';
import { ArvanVodModule } from './arvan-vod/arvan-vod.module.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) },
      defaultJobOptions: { attempts: 3, removeOnComplete: 1000, removeOnFail: 3000, backoff: { type: "exponential", delay: 2_000 } }
    }),
    CacheModule.registerAsync({
      useFactory: async () => {
        return {
          stores: [
            createKeyv(process.env.REDIS_URL),
          ],
        };
      },
      isGlobal: true
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 60,
        },
        {
          name: "second",
          ttl: 60000,
          limit: 60,
        },
      ],
    })
    , PrismaModule, AuthModule, RedisModule, ZarinPalModule, CategoryModule, BankModule, ExamModule, QuestionModule, PlanModule, CartModule, PkgModule, DaysModule, AccessModule, ArvanVodModule],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ATGaurd,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGaurd
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule { }
