import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe, Query, InternalServerErrorException, HttpStatus } from '@nestjs/common';
import { CartService } from '../cart.service.js';
import { CreateCartDto } from '../dto/create-cart.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { User } from '../../common/decorators/user.decorator.js';
import { AppException, customeErrorCode } from '../../common/filters/app.exception.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { Throttle } from '@nestjs/throttler';

@Controller('cart')
@Throttle({
  default: {
    ttl: 600_000,
    limit: 10
  }
})
@RoleDec(Role.USER)
export class UserCartController {
  constructor(private readonly cartService: CartService) { }

  @Get('callback')
  async callback(@Query('Authority') authority: string, @Query('Status') status: string, @User('id') userId: string) {
    if (status != 'OK') {
      await this.cartService.failedPayment(authority, userId);
      throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, customeErrorCode.PAYMENT_FAILED, "خطایی در خرید رخ داده است.")
    }
    if (await this.cartService.validate(authority, userId)) {
      return {
        success: true,
      }
    }

    await this.cartService.failedPayment(authority, userId);
    throw new InternalServerErrorException("اعتبار سنجی پرداخت با خطا روبرو شده است.")
  }

  @Post(':id/pay')
  continuePayment(@User('id', ParseUUIDPipe) userId: string, @Param('id', ParseUUIDPipe) cartId: string) {
    return this.cartService.continuePayment(userId, cartId)
  }

  @Post()
  create(@Body() createCartDto: CreateCartDto, @User('id', ParseUUIDPipe) userId: string) {
    return this.cartService.create(createCartDto, userId);
  }

  @Get()
  findAll(@User('id') userId: string, @Query("page", PaginationPipePipe) page: number) {
    return this.cartService.findAll(userId, page);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) cartId: string, @User('id', ParseUUIDPipe) userId: string) {
    return this.cartService.findOne(cartId, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) cartId: string, @User('id') userId: string) {
    return this.cartService.remove(cartId, userId);
  }
}
