import { HttpException, HttpStatus } from '@nestjs/common';


export class AppException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: unknown) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }
}

export enum customeErrorCode{
  PAYMENT_FAILED = "PAYMENT_FAILED"
}
