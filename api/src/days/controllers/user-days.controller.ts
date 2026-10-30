import { Controller, Get, Param, ParseUUIDPipe, Query, ParseBoolPipe } from '@nestjs/common';
import { DaysService } from '../days.service.js';
import { ContentType, Role } from '@prisma/client';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { ContentTypePipe } from '../../common/pipes/content-type.pipe.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { AccessService } from '../../access/access.service.js';
import { User } from '../../common/decorators/user.decorator.js';
import { QuestionService } from '../../question/services/question.service.js';

@Controller('user/days')
@RoleDec(Role.USER)
export class UserDaysController {
  constructor(private readonly daysService: DaysService, private accessService: AccessService, private questionService: QuestionService) {}
  @Get("pkg/:id")
  async findAll(@Param("id", ParseUUIDPipe) pkgId: string, @Query("search", SearchQueryPipe) search: string, @Query("page", PaginationPipePipe) page:number, @Query("limit", ParseBoolPipe) setLimit: boolean, @User("id") userId: string) {
    await this.accessService.assertCanAccessPkg(userId, pkgId)
    return this.daysService.findAll(search, page, pkgId, setLimit, false);
  }

  @RoleDec(Role.USER)
  @Get(":id/items")
  async findAllItems(@Param("id", ParseUUIDPipe) dayId: string, @Query("page", PaginationPipePipe) page:number, @Query("type", ContentTypePipe) type: ContentType, @User("id") userId: string) {
    await this.accessService.assertCanAccessDay(userId, dayId)
    return this.daysService.findAllItems(page, dayId, type, false);
  }

  @Get(':id/questions')
  async findQuestions(@Param('id') id: string, @User("id") userId: string, @Query("page", PaginationPipePipe) page:number) {
    await this.accessService.assertCanAccessDay(userId, id)
    return this.questionService.findAllDays(id, page)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @User("id") userId: string) {
    await this.accessService.assertCanAccessDay(userId, id)
    return this.daysService.findOne(id, false);
  }
}
