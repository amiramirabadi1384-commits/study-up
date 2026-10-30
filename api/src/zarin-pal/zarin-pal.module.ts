import { Module } from '@nestjs/common';
import { ZarinPalService } from './zarin-pal.service.js';

@Module({
  providers: [ZarinPalService],
  exports: [ZarinPalService]
})
export class ZarinPalModule {}
