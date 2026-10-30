import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ExamService } from '../services/exam.service.js';
import { CreateExamDto } from '../dto/create-exam.dto.js';
import { UpdateExamDto } from '../dto/update-exam.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { AddQuestionsDto } from '../dto/add-questions.dto.js';

@Controller('admin/exams')
@RoleDec(Role.ADMIN)
export class AdminExamController {
  constructor(private readonly examService: ExamService) {}

  @Post("publish/:id")
  publish(@Param("id", ParseUUIDPipe) id: string){
    return this.examService.publish(id)
  }

  @Post("un-publish/:id")
  unPublish(@Param("id", ParseUUIDPipe) id: string){
    return this.examService.unPublish(id)
  }

  @Post("public/:id")
  public(@Param("id", ParseUUIDPipe) id: string){
    return this.examService.public(id)
  }

  @Post("un-public/:id")
  unPublic(@Param("id", ParseUUIDPipe) id: string){
    return this.examService.unPublic(id)
  }

  @Post(":id/questions")
  addQuestions(@Body() addQuestionsDto: AddQuestionsDto, @Param("id", ParseUUIDPipe) examId: string) {
    return this.examService.addQuestions(examId, addQuestionsDto);
  }

  @Post()
  create(@Body() createExamDto: CreateExamDto) {
    return this.examService.create(createExamDto);
  }

  @Get()
  findAll(@Query("id", ParseUUIDPipe) categoryId: string) {
    return this.examService.findAll(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examService.update(id, updateExamDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examService.remove(id);
  }
}
