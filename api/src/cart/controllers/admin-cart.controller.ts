import { Controller, Get, Param, Query } from '@nestjs/common';
import { CartService } from '../cart.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';

@Controller('cart')
@RoleDec(Role.ADMIN)
export class AdminCartController {
  constructor(private readonly cartService: CartService) {}

  @Get("")
  findAllUsers(@Query('page', PaginationPipePipe) page: number) {
    return this.cartService.findAllUsers(page);
  }

  @Get(":userId")
  findAll(@Param("userId") userId: string, @Query("page", PaginationPipePipe) page:number) {
    return this.cartService.findAll(userId, page);
  }
}
