import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PkgService } from '../pkg.service.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { User } from '../../common/decorators/user.decorator.js';
import { AccessService } from '../../access/access.service.js';

@Controller('user/pkgs')
@RoleDec(Role.USER)
export class UserPkgController {
  constructor(private readonly pkgService: PkgService, private readonly accessService: AccessService) {}

  @Get("")
  findAll(@Query("search", SearchQueryPipe) search: string, @Query("page", PaginationPipePipe) page:number, @User('id') userId: string) {
    return this.pkgService.findAll(search, page, false, userId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) pkgId: string, @User('id') userId: string){
    await this.accessService.assertCanAccessPkg(userId, pkgId)
    return this.pkgService.findOneDetailes(userId, pkgId)
  }
}
