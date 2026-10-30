import { Module } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { UserCartController } from './controllers/user-cart.controller.js';
import { ZarinPalModule } from '../zarin-pal/zarin-pal.module.js';
import { AdminCartController } from './controllers/admin-cart.controller.js';

@Module({
  imports: [ZarinPalModule],
  controllers: [UserCartController, AdminCartController],
  providers: [CartService],
})
export class CartModule {}
