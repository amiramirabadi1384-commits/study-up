import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { mapPrismaError } from './prisma-error.mapper.js';
import type { FieldError } from '../pipes/validation-exception.factory.js';

// شکل استاندارد خطا که همه‌ی endpointها برمی‌گردونن - front روی همین شکل تکیه می‌کنه
export interface ApiErrorShape {
  statusCode: number;
  code: string; // 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DUPLICATE_ENTRY' | ...
  message: string;
  path: string;
  timestamp: string;
  fieldErrors?: FieldError[]; // فقط برای VALIDATION_ERROR پر می‌شه
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = this.resolveBody(exception);

    if (body.statusCode >= 500) {
      // جزئیات کامل فقط تو لاگ سرور - چیزی از خطای داخلی به کلاینت درز نمی‌کنه
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(body.statusCode).json({
      ...body,
      path: req?.url ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  private resolveBody(exception: unknown): Omit<ApiErrorShape, 'path' | 'timestamp'> {
    // ۱) خطاهای Prisma (unique constraint، not found، ...)
    const prismaMapped = mapPrismaError(exception);
    if (prismaMapped) return prismaMapped;

    // ۲) خطاهای HTTP از جمله BadRequestException که از
    //    validationExceptionFactory با fieldErrors ساخته‌شده
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        if (Array.isArray(r.fieldErrors)) {
          return {
            statusCode,
            code: 'VALIDATION_ERROR',
            message: (r.message as string) ?? 'داده‌ی ارسالی معتبر نیست',
            fieldErrors: r.fieldErrors as FieldError[],
          };
        }
        return {
          statusCode,
          // اگه خودت تو throw کردن یه code سفارشی دادی، همون اولویت داره؛
          // وگرنه بر اساس statusCode یه code پیش‌فرض ساخته می‌شه
          code: typeof r.code === 'string' ? r.code : this.statusToCode(statusCode),
          message: (r.message as string) ?? exception.message,
          ...(r.details ? { details: r.details } : {}),
        };
      }

      return {
        statusCode,
        code: this.statusToCode(statusCode),
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // ۳) هر چیز پیش‌بینی‌نشده‌ی دیگه
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'خطای داخلی سرور',
    };
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    }
  }
}

// در main.ts:
// app.useGlobalFilters(new AllExceptionsFilter());
