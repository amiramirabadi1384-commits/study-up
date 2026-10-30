import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from "@nestjs/jwt"
import { AtStrategy } from './strategies/at.strategy.js';
import { RtStrategy } from './strategies/rt.strategy.js';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, AtStrategy, RtStrategy],
  controllers: [AuthController]
})
export class AuthModule {}
