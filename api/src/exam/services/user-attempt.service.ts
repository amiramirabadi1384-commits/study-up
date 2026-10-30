import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Attempt, AttemptStatus, ExamStatus, ExamType } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { AUTO_SUBMIT, AUTO_UPSERT_QUESTION_STATE } from '../queue/name.queue.js';
import { Queue } from 'bullmq';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { REDIS_CLIENT } from '../../redis/redis.module.js';
import type { RedisClientType } from 'redis';
import { AnswerQuestionDto } from '../dto/answer-question.dto.js';
import { QuestionType } from '../types/question-type.type.js';
import { QuestionInterface } from '../types/question.type.js';
import { AccessService } from '../../access/access.service.js';

@Injectable()
export class UserAttemptService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(AUTO_SUBMIT) private autoSubmitQueue: Queue,
    @InjectQueue(AUTO_UPSERT_QUESTION_STATE) private autoUpsertQuestionState: Queue,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(REDIS_CLIENT) private redis: RedisClientType,
    private accessService: AccessService
  ) { }

  private limit = 10;

  async findAllAttempt(userId: string, examId: string | undefined, page: number = 1) {
    const now = new Date();
    const attempts = await this.prisma.attempt.findMany({
      where: {
        userId,
        ...(examId && {
          examId
        })
      },
      orderBy: [
        { expireAt: "asc" }
      ],
      skip: this.limit * (page - 1),
      take: this.limit + 1
    })

    const nextPage = this.limit < attempts.length
    if (nextPage) attempts.pop()

    let sort: {
      pending: Attempt[],
      submitted: Attempt[],
    } = {
      pending: [],
      submitted: []
    }
    for (const attempt of attempts) {
      if (attempt.expireAt > now && attempt.status === AttemptStatus.PENDING) {
        sort.pending.push(attempt)
      }
      else {
        sort.submitted.push(attempt)
      }
    }

    return {
      success: true,
      data: {
        ...sort,
        nextPage
      }
    }
  }

  async createAttempt(userId: string, examId: string) {
    await this.accessService.assertCanAccessExam(userId, examId);
    const now = new Date();
    const attemptExists = await this.prisma.attempt.findFirst({
      where: {
        examId,
        userId,
        expireAt: { gt: now },
        status: { not: AttemptStatus.SUBMITTED }
      },
      select: {
        id: true,
        expireAt: true
      }
    })

    if (attemptExists) {
      return {
        success: true,
        data: attemptExists,
        now
      }
    }
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        OR: [
          { userId },
          { type: ExamType.OFFICIAL, status: ExamStatus.LIVE }
        ]
      },
      select: {
        duration: true,
        type: true,
        startAt: true,
        endAt: true
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }
    if (exam.type === ExamType.OFFICIAL) {
      if (exam.startAt && exam.startAt > now) {
        throw new BadRequestException("آزمون هنوز شروع نشده است.")
      }
      if (exam.endAt && exam.endAt < now) {
        throw new BadRequestException("زمان آزمون به پایان رسیده است.")
      }
    }

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        examId,
        startAt: now,
        expireAt: new Date(now.getTime() + exam.duration * 1000)
      },
      select: {
        id: true,
        expireAt: true
      }
    })

    // Must be delayed until the attempt expires, otherwise the worker runs immediately and fails.
    await this.autoSubmitQueue.add(
      "auto-submit",
      { attemptId: attempt.id },
      { jobId: attempt.id, delay: exam.duration * 1000 + 1000 }
    )

    return {
      success: true,
      data: attempt,
      now
    }
  }

  async getQuestions(userId: string, attemptId: string, page: number = 1) {
    const now = new Date()

    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId
      }
    })

    if (!attempt) {
      throw new NotFoundException("تلاشی برای شما یافت نشد.")
    }
    if (attempt.userId != userId) {
      throw new ForbiddenException("این تلاش برای شما ثبت نشده است.")
    }
    if (attempt.expireAt < now || attempt.status == AttemptStatus.SUBMITTED) {
      throw new ForbiddenException("آزمون به پایان رسیده است.")
    }

    const { questions, nextPage } = await this.getQuestionsFromCache(page, attempt.examId, attempt.expireAt, now)

    const ids = questions.map(q => q.id)
    const mapAnswers = await this.getAnswersFromCache(attemptId, ids);

    let newSet = []
    for (const question of questions) {
      if (mapAnswers.has(question.id)) {
        newSet.push({
          ...question,
          userAnswer: mapAnswers.get(question.id)
        })
      }
      else {
        newSet.push(question)
      }
    }

    return {
      success: true,
      data: {
        nextPage,
        questions: newSet
      }
    }
  }

  async answerQuestion(answerQuestionDto: AnswerQuestionDto, attemptId: string, questionId: string, userId: string) {
    const now = new Date();
    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId
      },
      select: {
        userId: true,
        examId: true,
        expireAt: true,
        status: true,
      },
    })

    if (!attempt) {
      throw new NotFoundException("تلاشی برای شما یافت نشد.")
    }
    if (attempt.userId != userId) {
      throw new ForbiddenException("این تلاش برای شما ثبت نشده است.")
    }
    if (attempt.expireAt < now || attempt.status == AttemptStatus.SUBMITTED) {
      throw new ForbiddenException("آزمون به پایان رسیده است.")
    }

    if (answerQuestionDto.optionId) {
      const question = await this.prisma.question.findFirst({
        where: {
          id: questionId,
          // question belongs to the exam directly or through ExamQuestion
          OR: [
            { examId: attempt.examId },
            { exams: { some: { examId: attempt.examId } } }
          ],
          options: {
            some: {
              id: answerQuestionDto.optionId
            }
          }
        }
      })

      if (!question) {
        throw new NotFoundException("سوال یا گزینه ی مورد نظر پیدا نشده است.");
      }
    }

    const key = `attempt:${attemptId}:questions`;

    if (answerQuestionDto.optionId) {
      await this.prisma.attemptAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId
          }
        },
        create: {
          attemptId,
          optionId: answerQuestionDto.optionId,
          questionId
        },
        update: {
          optionId: answerQuestionDto.optionId,
        }
      })

      await this.redis.hSet(key, questionId, answerQuestionDto.optionId)
      // keep the cache hash from living forever
      await this.redis.expire(
        key,
        Math.max(60, Math.ceil((attempt.expireAt.getTime() - now.getTime()) / 1000) + 3600)
      )
    }
    else {
      await this.prisma.attemptAnswer.deleteMany({
        where: {
          attemptId,
          questionId
        }
      })

      await this.redis.hDel(key, questionId)
    }

    return {
      success: true
    }
  }

  async submit(attemptId: string, userId: string) {
    const now = new Date()
    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId
      }
    })

    if (!attempt) {
      throw new NotFoundException("تلاشی برای شما یافت نشد.")
    }
    if (attempt.userId != userId) {
      throw new ForbiddenException("این تلاش برای شما ثبت نشده است.")
    }
    if (attempt.expireAt < now || attempt.status == AttemptStatus.SUBMITTED) {
      throw new ForbiddenException("آزمون از قبل به پایان رسیده است.")
    }

    const claimed = await this.prisma.attempt.updateMany({
      where: {
        id: attemptId,
        status: { not: AttemptStatus.SUBMITTED }
      },
      data: {
        status: AttemptStatus.SUBMITTED
      }
    })

    if (claimed.count === 0) {
      throw new ForbiddenException("آزمون از قبل به پایان رسیده است.")
    }

    await this.autoSubmitQueue.remove(attemptId).catch(() => null)

    return {
      success: true,
      data: { id: attemptId }
    }
  }

  async getResult(attemptId: string, userId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId
      }
    })

    if (!attempt) {
      throw new NotFoundException("تلاش مورد نظر یافت نشده است.")
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException("این تلاش برای شما ثبت نشده است.")
    }
    if (attempt.status !== AttemptStatus.SUBMITTED && attempt.expireAt > new Date()) {
      throw new NotFoundException("تلاش هنوز پایان نیافته است.")
    }

    const result = await this.prisma.result.findUnique({
      where: {
        attemptId
      }
    })

    if (result) {
      return {
        success: true,
        data: result
      }
    }

    const exam = await this.prisma.exam.findUnique({
      where: {
        id: attempt.examId
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }

    const count = exam.count

    if (!count || count < 1) {
      throw new BadRequestException("آزمون سوالی ندارد و نتیجه ای قابل محاسبه نیست.")
    }

    const answers = await this.prisma.attemptAnswer.findMany({
      where: {
        attemptId,
      },
      include: {
        option: {
          select: {
            id: true,
            isTrue: true
          }
        }
      }
    })

    let correct = 0
    let wrong = 0

    for (const answer of answers) {
      if (answer.option.isTrue) {
        correct += 1
      }
      else {
        wrong += 1
      }
    }

    // jobId makes the enqueue idempotent (concurrent getResult calls, retries).
    await this.autoUpsertQuestionState.add("auto-upsert", { attemptId }, { jobId: `qstate-${attemptId}` })

    const result2 = await this.prisma.result.upsert({
      where: {
        attemptId,
      },
      update: {},
      create: {
        attemptId,
        correct,
        wrong,
        points: correct / count * 100,
        pointsWithMinus: (correct * 3 - wrong) / (count * 3) * 100,
        totalCount: count,
        examId: exam.id
      },
      include: {
        attempt: {
          include: {
            exam: {
              select: {
                type: true
              }
            }
          }
        }
      }
    });

    const { attempt: _attempt, ...savedResult } = result2

    return {
      success: true,
      data: savedResult,
      message: "وضعیت پاسخ گویی سوالات به زودی به سوابق اضافه می شود."
    }
  }

  async getAttemptReview(attemptId: string, userId: string, page: number = 1, type: QuestionType = QuestionType.ALL) {
    const attempt = await this.prisma.attempt.findUnique({
      where: {
        id: attemptId
      }
    })


    if (!attempt) {
      throw new NotFoundException("تلاش مورد نظر یافت نشده است.")
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException("این تلاش برای شما ثبت نشده است.")
    }

    await this.accessService.assertCanAccessExam(userId, attempt.examId);
    if (attempt.status !== AttemptStatus.SUBMITTED && attempt.expireAt > new Date()) {
      throw new NotFoundException("تلاش هنوز پایان نیافته است.")
    }

    const questions = await this.prisma.question.findMany({
      where: {
        OR: [
          { examId: attempt.examId },
          { exams: { some: { examId: attempt.examId } } }
        ],
        ...(type === QuestionType.CORRECT && {
          attemptAnswers: {
            some: {
              attemptId,
              option: {
                isTrue: true
              }
            }
          }
        }),
        ...(type === QuestionType.WRONG && {
          attemptAnswers: {
            some: {
              attemptId,
              option: {
                isTrue: false
              }
            }
          }
        }),
        ...(type === QuestionType.NO_ANSWER && {
          attemptAnswers: {
            none: {
              attemptId
            }
          }
        })
      },
      include: {
        options: true
      },
      skip: (page - 1) * this.limit,
      take: this.limit + 1,
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" }
      ]
    })

    const nextPage = this.limit < questions.length
    if (nextPage) questions.pop()

    if (type === QuestionType.NO_ANSWER) {
      return {
        success: true,
        data: {
          questions,
          nextPage
        }
      }
    }

    const ids = questions.map(q => q.id)

    const answers = await this.prisma.attemptAnswer.findMany({
      where: {
        attemptId,
        questionId: { in: ids }
      }
    })

    const answerMap = new Map<string, string>(
      answers.map(answer => (
        [answer.questionId, answer.optionId]
      ))
    )

    const newSet = questions.map(question => ({
      ...question,
      userAnswer: answerMap.get(question.id) ?? null,
    }));

    return {
      success: true,
      data: {
        questions: newSet,
        nextPage
      }
    }
  }


  private async getAnswersFromCache(attemptId: string, questionIds: string[]) {
    const key = `attempt:${attemptId}:questions`;
    const cached = await this.redis.hGetAll(key);
    let mapAnswer = new Map<string, string>()
    let missingAnswers = []

    for (const qId of questionIds) {
      if (cached[qId] !== undefined) {
        mapAnswer.set(qId, cached[qId])
      }
      else {
        missingAnswers.push(qId)
      }
    }

    if (missingAnswers.length === 0) {
      return mapAnswer
    }

    const attemptAnswers = await this.prisma.attemptAnswer.findMany({
      where: {
        attemptId,
        questionId: { in: missingAnswers }
      }
    })

    for (const aa of attemptAnswers) {
      mapAnswer.set(aa.questionId, aa.optionId);
    }
    if (attemptAnswers.length > 0) {
      await this.redis.hSet(key,
        Object.fromEntries(
          attemptAnswers.map(aa => ([
            aa.questionId,
            aa.optionId
          ]))
        )
      )
    }

    return mapAnswer
  }

  private async getQuestionsFromCache(page: number, examId: string, expireAt: Date, now: Date) {

    const key = `exam:${examId}:page:${page}`
    const cached = await this.cacheManager.get<{ questions: QuestionInterface[], nextPage: boolean }>(key)
    if (cached) {
      return cached
    }

    const questionsFromDb = await this.prisma.examQuestion.findMany({
      where: {
        examId
      },
      include: {
        question: {
          select: {
            id: true,
            text: true,
            options: {
              select: {
                text: true,
                id: true
              }
            }
          }
        }
      },
      skip: this.limit * (page - 1),
      take: this.limit + 1,
      orderBy: [
        { order: "asc" }
      ]
    })

    const questions = questionsFromDb.map(question => question.question)

    const nextPage = this.limit < questions.length
    if (nextPage) questions.pop()

    const result = {
      questions,
      nextPage
    }

    await this.cacheManager.set(key, result, expireAt.getTime() - now.getTime() + 60 * 1000)

    return result
  }
}
