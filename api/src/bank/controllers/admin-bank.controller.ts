import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, ParseBoolPipe } from '@nestjs/common';
import { BankService } from '../bank.service.js';
import { CreateBankDto } from '../dto/create-bank.dto.js';
import { UpdateBankDto } from '../dto/update-bank.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';

@Controller('admin/banks')
@RoleDec(Role.ADMIN)
export class AdminBankController {
  constructor(private readonly bankService: BankService) {}

  @Post("public/:id")
  public(@Param("id", ParseUUIDPipe) id: string){
    return this.bankService.public(id)
  }

  @Post("un-public/:id")
  unPublic(@Param("id", ParseUUIDPipe) id: string){
    return this.bankService.unPublic(id)
  }

  @Post()
  create(@Body() createBankDto: CreateBankDto) {
    return this.bankService.create(createBankDto);
  }

  @Get(":id")
  findAll(@Param("id", ParseUUIDPipe) categoryId: string, @Query("children", ParseBoolPipe) children: boolean) {
    return this.bankService.findAll(categoryId, children);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBankDto: UpdateBankDto) {
    return this.bankService.update(id, updateBankDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankService.remove(id);
  }
}
