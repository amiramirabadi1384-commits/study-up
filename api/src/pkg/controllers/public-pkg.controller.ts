import { Controller, Get, Param, Query } from '@nestjs/common';
import { PkgService } from '../pkg.service.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('pkgs')
@Public()
export class PublicPkgController {
  constructor(private readonly pkgService: PkgService) {}

  @Get()
  findAll(@Query("search", SearchQueryPipe) search: string, @Query("page", PaginationPipePipe) page:number) {
    return this.pkgService.findAll(search, page, false);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pkgService.findOne(id, false);
  }
}
