import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { DaysService } from '../days.service.js';
import { CreateDayDto } from '../dto/create-day.dto.js';
import { UpdateDayDto } from '../dto/update-day.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { ContentType, Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { UpdateOrderDto } from '../dto/update-order.dto.js';
import { AddItemDto } from '../dto/add-item.dto.js';
import { UpdateItemsOrderDto } from '../dto/update-items-ordre.dto.js';
import { ContentTypePipe } from '../../common/pipes/content-type.pipe.js';

@Controller('admin/days')
@RoleDec(Role.ADMIN)
export class AdminDaysController {
  constructor(private readonly daysService: DaysService) {}

  @Post("pkg/:id")
  create(@Param("id", ParseUUIDPipe) pkgId: string, @Body() createDayDto: CreateDayDto) {
    return this.daysService.create(createDayDto, pkgId);
  }

  @Post(":id/items")
  addItem(@Param("id", ParseUUIDPipe) dayId:string, addItemDto: AddItemDto){
    return this.daysService.addItem(dayId, addItemDto)
  }

  @Get(":id")
  findAllItems(@Param("id", ParseUUIDPipe) dayId: string, @Query("page", PaginationPipePipe) page:number, @Query("type", ContentTypePipe) type: ContentType) {
    return this.daysService.findAllItems(page, dayId, type);
  }

  @Patch('pkg/:id')
  updateOrder(@Param('id') id: string, @Body() updateOrder: UpdateOrderDto) {
    return this.daysService.updateOrder(id, updateOrder);
  }

  @Patch(':id/items/reorder')
  updateItemsOrder(@Param('id') dayId: string, @Body() dto: UpdateItemsOrderDto) {
    return this.daysService.updateItemsOrder(dayId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDayDto: UpdateDayDto) {
    return this.daysService.update(id, updateDayDto);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.daysService.removeItem(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.daysService.remove(id);
  }
}
