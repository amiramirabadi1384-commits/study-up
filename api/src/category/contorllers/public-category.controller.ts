import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CategoryService } from '../category.service.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('category')
@Public()
export class PublicCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(@Query("parentId", new ParseUUIDPipe()) parentId: string, @Query("search", SearchQueryPipe) search: string, @Query('page', PaginationPipePipe) page: number, @Query("limit", PaginationPipePipe) limit: number) {
    return this.categoryService.findAll(parentId, search, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }
}
