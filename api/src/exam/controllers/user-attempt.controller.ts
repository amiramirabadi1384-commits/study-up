import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { User } from '../../common/decorators/user.decorator.js';
import { UserAttemptService } from '../services/user-attempt.service.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { QuestionTypePipe } from '../pipes/question-type.pipe.js';
import { QuestionType } from '../types/question-type.type.js';
import { AnswerQuestionDto } from '../dto/answer-question.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('user/attempts')
@RoleDec(Role.USER)
export class UserAttemptController {
  constructor(private readonly onlineExamService: UserAttemptService) { }

  @Get("attempts")
  findAllAttempt(@User("id") userId: string, @Query('exam', new ParseUUIDPipe({ optional: true })) examId: string | undefined, @Query("page", PaginationPipePipe) page: number) {
    return this.onlineExamService.findAllAttempt(userId, examId, page)
  }

  @Get("questions/:id")
  @Throttle({
    default: {
      ttl: 60_000,
      limit: 30
    },
  })
  getQuestions(@User("id") userId: string, @Param("id", ParseUUIDPipe) attemptId: string, @Query('page', PaginationPipePipe) page: number) {
    return this.onlineExamService.getQuestions(userId, attemptId, page)
  }

  @Get("attempts/:id/result")
  getResult(@Param('id', ParseUUIDPipe) attemptId: string, @User('id') userId: string) {
    return this.onlineExamService.getResult(attemptId, userId);
  }

  @Get("attempts/:id/review")
  async getAttemptReview(@Param('id', ParseUUIDPipe) attemptId: string, @User('id') userId: string, @Query('page', PaginationPipePipe) page: number, @Query("type", QuestionTypePipe) type: QuestionType) {
    return this.onlineExamService.getAttemptReview(attemptId, userId, page, type)
  }

  @Post("attempts")
  async createAttempt(@User("id") userId: string, @Body("examId", ParseUUIDPipe) exmaId: string) {
    return this.onlineExamService.createAttempt(userId, exmaId);
  }

  @Post("attempts/:id/question/:questionId")
  @Throttle({
    default: {
      ttl: 60_000,
      limit: 120
    },
    second:{
      ttl: 60_000,
      limit: 120
    }
  })
  answerQuestion(@Body() answerQuestionDto: AnswerQuestionDto, @Param("id", ParseUUIDPipe) attemptId: string, @Param("questionId", ParseUUIDPipe) questionId: string, @User("id") userId: string) {
    return this.onlineExamService.answerQuestion(answerQuestionDto, attemptId, questionId, userId)
  }

  @Patch("attempts/:id/submit")
  submitAttempt(@Param("id", ParseUUIDPipe) attemptId: string, @User('id') userId: string) {
    return this.onlineExamService.submit(attemptId, userId)
  }
}