import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CategoryService } from '../category.service.js';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { UpdateCategoryDto } from '../dto/update-category.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';

@Controller('admin/category')
@RoleDec(Role.ADMIN)
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Post(":id/parent/:parentId")
  addParent(@Param("id", ParseUUIDPipe) catId:string, @Param("parentId", ParseUUIDPipe) parentId: string){
    return this.categoryService.addParent(catId, parentId)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(":id/parent/:parentId")
  removeParent(@Param("id", ParseUUIDPipe) catId:string, @Param("parentId", ParseUUIDPipe) parentId: string){
    return this.categoryService.removeParent(catId, parentId)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
