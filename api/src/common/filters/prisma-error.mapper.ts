import { Prisma } from '@prisma/client';
import { HttpStatus } from '@nestjs/common';

export interface MappedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

// فقط رایج‌ترین کدهای Prisma - لیست کامل:
// https://www.prisma.io/docs/orm/reference/error-reference
export function mapPrismaError(exception: unknown): MappedError | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint failed
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          message: target ? `مقدار وارد شده برای «${target}» قبلاً استفاده شده است` : 'این مقدار قبلاً ثبت شده است',
        };
      }
      case 'P2025':
        // Record not found (روی update/delete)
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'رکورد مورد نظر یافت نشد',
        };
      case 'P2003':
        // Foreign key constraint failed
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: 'رکورد مرتبط (foreign key) معتبر نیست',
        };
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'RELATION_VIOLATION',
          message: 'این تغییر با رابطه‌ی موجود بین رکوردها در تضاد است',
        };
      default:
        // خطاهای شناخته‌شده‌ی دیگه رو 400 عمومی برگردون، نه 500
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'DATABASE_ERROR',
          message: 'درخواست به دلیل خطای پایگاه‌داده رد شد',
        };
    }
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'داده‌ی ارسالی با schema همخوانی ندارد',
    };
  }

  if (
    exception instanceof Prisma.PrismaClientInitializationError ||
    exception instanceof Prisma.PrismaClientRustPanicError
  ) {
    // اینا مشکل زیرساختی/اتصال دیتابیسن - جزئیات نباید به کلاینت درز کنه
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'DATABASE_UNAVAILABLE',
      message: 'در حال حاضر امکان برقراری ارتباط با پایگاه‌داده وجود ندارد',
    };
  }

  return null; // این خطا از Prisma نیست
}
