import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { QuestionService } from '../services/question.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { User } from '../../common/decorators/user.decorator.js';
import { AccessService } from '../../access/access.service.js';
import { UpsertUserQuestionStateDto } from '../dto/upsert-q-state.dto.js';

@Controller('user/questions')
@RoleDec(Role.USER)
export class UserQuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly accessService: AccessService
  ) {}

  @Get("save")
  getSavedQuestions(@User('id') userId:string, @Query('page', PaginationPipePipe) page: number){
    return this.questionService.getSavedQuestions(userId, page);
  }

  @Get("bank/:id")
  async findAll(@Param("id", ParseUUIDPipe) bankId: string, @Query("page", PaginationPipePipe) page: number, @Query('search', SearchQueryPipe) search: string, @User('id') userId: string) {
    await this.accessService.assertCanAccessBank(userId, bankId)
    return this.questionService.findAll(bankId, search, page);
  }

  @Get("exam/:id")
  async findAllFromExam(@Param("id", ParseUUIDPipe) examId: string, @Query("page", PaginationPipePipe) page: number, @Query('search', SearchQueryPipe) search: string, @User('id') userId: string) {
    await this.accessService.assertCanAccessExam(userId, examId)
    await this.accessService.assertCanReviewExamQuestions(userId, examId)
    return this.questionService.findAllExams(examId, search, page);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @User('id') userId: string) {
    await this.accessService.assertCanAccessQuestion(userId, id)
    return this.questionService.findOne(id);
  }

  @Post(":id/save")
  async saveQuestion(@User('id') userId: string, @Param('id', ParseUUIDPipe) questionId:string){
    await this.accessService.assertCanAccessQuestion(userId, questionId)
    return this.questionService.saveQuestion(userId, questionId)
  }

  @Patch(":id")
  async upsertUerQuestionState(@Param('id', ParseUUIDPipe) questionId: string, @User('id') userId: string, @Body() dto: UpsertUserQuestionStateDto){
    await this.accessService.assertCanAccessQuestion(userId, questionId)
    return this.questionService.upsertQuestionState(questionId, userId, dto);
  }
}
