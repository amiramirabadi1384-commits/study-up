import { Controller, Get, Param, Query, ParseUUIDPipe, ParseBoolPipe } from '@nestjs/common';
import { BankService } from '../bank.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('banks')
@Public()
export class PublicBankController {
  constructor(private readonly bankService: BankService) {}

  @Get(":id")
  findAll(@Param("id", ParseUUIDPipe) categoryId: string, @Query("children", ParseBoolPipe) children: boolean) {
    return this.bankService.findAll(categoryId, children);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }
}
