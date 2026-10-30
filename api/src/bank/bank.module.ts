import { Module } from '@nestjs/common';
import { BankService } from './bank.service.js';
import { AdminBankController } from './controllers/admin-bank.controller.js';
import { PublicBankController } from './controllers/public-bank.controller.js';

@Module({
  controllers: [AdminBankController, PublicBankController],
  providers: [BankService],
})
export class BankModule {}
