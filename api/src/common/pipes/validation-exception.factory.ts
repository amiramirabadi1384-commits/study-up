import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface FieldError {
  field: string; // مسیر کامل تو دیتای تودرتو، مثل "options.0.text"
  messages: string[]; // پیام‌های تمام constraintهای شکست‌خورده برای این field
}

// خروجی ValidationPipe پیش‌فرض NestJS یه آرایه‌ی flat از استرینگه که
// front نمی‌تونه به فیلد فرم وصلش کنه. این تابع یه ساختار field-by-field می‌سازه.
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fieldErrors = flattenValidationErrors(errors);
  return new BadRequestException({
    message: 'داده‌ی ارسالی معتبر نیست',
    fieldErrors, // این رو AllExceptionsFilter می‌گیره و در details می‌ذاره
  });
}

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  const result: FieldError[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result.push({ field: path, messages: Object.values(error.constraints) });
    }

    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children, path));
    }
  }

  return result;
}
