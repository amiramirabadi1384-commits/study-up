import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { PkgService } from '../pkg.service.js';
import { CreatePkgDto } from '../dto/create-pkg.dto.js';
import { UpdatePkgDto } from '../dto/update-pkg.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';

@Controller('admin/pkgs')
@RoleDec(Role.ADMIN)
export class AdminPkgController {
  constructor(private readonly pkgService: PkgService) { }

  @Post("publish/:id")
  publish(@Param("id", ParseUUIDPipe) id: string) {
    return this.pkgService.publish(id)
  }

  @Post("un-publish/:id")
  unPublish(@Param("id", ParseUUIDPipe) id: string) {
    return this.pkgService.unPublish(id)
  }

  @Post()
  create(@Body() createPkgDto: CreatePkgDto) {
    return this.pkgService.create(createPkgDto);
  }

  @Get()
  findAll(@Query("search", SearchQueryPipe) search: string, @Query("page", PaginationPipePipe) page: number) {
    return this.pkgService.findAll(search, page);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pkgService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePkgDto: UpdatePkgDto) {
    return this.pkgService.update(id, updatePkgDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pkgService.remove(id);
  }
}
