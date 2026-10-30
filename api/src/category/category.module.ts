import { Module } from '@nestjs/common';
import { CategoryService } from './category.service.js';
import { AdminCategoryController } from './contorllers/admin-category.controller.js';
import { PublicCategoryController } from './contorllers/public-category.controller.js';

@Module({
  controllers: [AdminCategoryController, PublicCategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
