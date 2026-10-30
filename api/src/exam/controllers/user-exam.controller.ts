import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { UserExamService } from '../services/user-exam.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { UserCreateExamDto } from '../dto/user-create-exam.dto.js';
import { User } from '../../common/decorators/user.decorator.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { LimitPipe } from '../../common/pipes/limit.pipe.js';

@Controller('user/exams')
@RoleDec(Role.USER)
export class UserExamController {
  constructor(private readonly userExamService: UserExamService) {}

  @Post()
  create(@Body() dto: UserCreateExamDto, @User("id") userId: string) {
    return this.userExamService.create(dto, userId);
  }

  @Get("official")
  findAllOfficial(@Query("id", ParseUUIDPipe) categoryId: string, @User('id') userId: string, @Query("page", PaginationPipePipe) page: number, @Query("limit", LimitPipe) limit: number) {
    return this.userExamService.findAllOfficial(categoryId, page, limit);
  }

  @Get()
  findAll(@Query("id", ParseUUIDPipe) categoryId: string, @User('id') userId: string, @Query("page", PaginationPipePipe) page: number,  @Query("limit", LimitPipe) limit: number) {
    return this.userExamService.findAll(userId, categoryId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @User('id') userId: string) {
    return this.userExamService.findOne(userId, id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @User('id') userId: string) {
    return this.userExamService.remove(userId, id);
  }
}
