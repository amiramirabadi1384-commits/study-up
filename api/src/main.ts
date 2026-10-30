import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory.js';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // propertyهای خارج از DTO رو حذف می‌کنه
      forbidNonWhitelisted: true, // propertyهای اضافی رو با خطا رد می‌کنه (نه فقط حذف)
      transform: true, // payload رو به instance کلاس DTO تبدیل می‌کنه (type coercion هم انجام می‌ده)
      exceptionFactory: validationExceptionFactory, // خروجی field-by-field به‌جای آرایه‌ی flat
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.use(helmet());

  app.setGlobalPrefix("api/v1")
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
