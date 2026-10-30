import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateExamDto } from '../dto/update-exam.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DifficultyFilter, SourceFilter, UserCreateExamDto } from '../dto/user-create-exam.dto.js';
import { ExamStatus, ExamType, Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { AUTO_REMOVE } from '../queue/name.queue.js';
import { Queue } from 'bullmq';
import { AccessService } from '../../access/access.service.js';

@Injectable()
export class UserExamService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(AUTO_REMOVE) private autoRemoveQueue: Queue,
    private accessService: AccessService
  ) { }

  async create(dto: UserCreateExamDto, userId: string) {
    const courseId: string = await this.validateSameCourse(dto.banks.map(b => b.bankId))

    for (const bankId of new Set(dto.banks.map(b => b.bankId))) {
      await this.accessService.assertCanAccessBank(userId, bankId)
    }

    return this.prisma.$transaction(async (tx) => {
      const banks = await this.selectRandomQuestions(userId, dto);
      let count = 0;
      let duration = 0;
      const banksFromDb = await tx.bank.findMany({
        where: {
          id: { in: banks.map(b => b.bankId) }
        },
        select: {
          duration: true,
          id: true,
          category: {
            select: {
              title: true
            }
          }
        }
      })
      const mapped = new Map<string, number>(banksFromDb.map(b => ([b.id, b.duration])))

      for (const bank of banks) {
        count += bank.requestedCount;
        duration += bank.requestedCount * (mapped.get(bank.bankId) ?? 0);
      }

      const exam = await tx.exam.create({
        data: {
          userId,
          count,
          status: ExamStatus.LIVE,
          duration,
          title: `آزمون:${banksFromDb.map(b => b.category.title).join('-')}`,
          courseId
        },
        select: {
          id: true
        }
      })

      const questions = banks.flatMap(b => (b.questions))

      await tx.examQuestion.createMany({
        data: questions.map((q, index) => (
          {
            examId: exam.id,
            questionId: q.id,
            order: index
          }
        ))
      })

      await this.autoRemoveQueue.add("auto remove unused exam", { examId: exam.id }, {
        delay: 86_400_000
      })

      return {
        success: true,
        data: exam
      }
    });
  }

  async findAll(userId: string, categoryId: string, page: number = 1, limit: number = 10) {
    const exams = await this.prisma.exam.findMany({
      where: {
        // user-generated exams are stored with their course, not a category
        OR: [{ categoryId }, { courseId: categoryId }],
        userId,
        type: { not: ExamType.OFFICIAL },
      },
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      take: limit + 1,
      skip: limit * (page - 1),
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ]
    })

    const nextPage = limit < exams.length
    if(nextPage) exams.pop()

    return {
      success: true,
      data: {exams, nextPage}
    }
  }

  async findAllOfficial(categoryId: string, page: number = 1, limit: number = 10) {
    const exams = await this.prisma.exam.findMany({
      where: {
        categoryId,
        type: ExamType.OFFICIAL,
        status: ExamStatus.LIVE,
      },
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      take: limit + 1,
      skip: limit * (page - 1),
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ]
    })

    const nextPage = limit < exams.length
    if(nextPage) exams.pop()

    return {
      success: true,
      data: {exams, nextPage}
    }
  }

  async findOne(userId: string, id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }
    const isPublicOfficial =
      exam.type === ExamType.OFFICIAL && exam.status === ExamStatus.LIVE

    if (exam.userId !== userId && !isPublicOfficial) {
      throw new ForbiddenException("آزمون مورد نظر به شما تعلق ندارد.")
    }

    return {
      success: true,
      data: exam
    }
  }

  async remove(userId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id,
      },
      select: {
        userId: true
      }
    })
    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }
    if (exam.userId !== userId) {
      throw new ForbiddenException("آزمون مورد نظر به شما تعلق ندارد.")
    }

    await this.prisma.exam.delete({
      where: {
        id,
      }
    })

    return {
      success: true,
      data: { id }
    }
  }

  private async selectRandomQuestions(
    userId: string,
    dto: UserCreateExamDto,
  ) {
    const { banks, filter, difficulty, fromMarked } = dto;

    if (!banks.length) {
      throw new BadRequestException(
        'حداقل باید یک بانک انتخاب کنید.',
      );
    }

    // Avoid accidentally selecting the same bank twice.
    const bankIds = banks.map((b) => b.bankId);

    if (new Set(bankIds).size !== bankIds.length) {
      throw new BadRequestException(
        'هر بانک تنها یکبار قابل انتخاب است.',
      );
    }

    if (!filter.length) {
      throw new BadRequestException(
        'حداقل یک فیلتر برای منبع باید انتخاب شود.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const result: {
          bankId: string;
          requestedCount: number;
          questions: { id: string; bankId: string }[];
        }[] = [];

        for (const bank of banks) {
          const conditions: Prisma.Sql[] = [
            Prisma.sql`q."bankId" = ${bank.bankId}`,
          ];

          // Difficulty filter: any selected difficulty.
          if (
            difficulty.length > 0 &&
            !difficulty.includes(DifficultyFilter.MIXED)
          ) {
            conditions.push(Prisma.sql`
              q."difficulty"::text IN (
                ${Prisma.join(difficulty)}
              )
            `);
          }

          // Source filters are OR conditions.
          if (!filter.includes(SourceFilter.ALL)) {
            const sourceConditions: Prisma.Sql[] = [];

            if (filter.includes(SourceFilter.WRONG)) {
              sourceConditions.push(Prisma.sql`
                EXISTS (
                  SELECT 1
                  FROM "UserQuestionState" uqs
                  WHERE uqs."userId" = ${userId}
                    AND uqs."questionId" = q."id"
                    AND uqs."lastOutcome"::text = 'WRONG'
                )
              `);
            }

            if (
              filter.includes(SourceFilter.UNANSWERED)
            ) {
              sourceConditions.push(Prisma.sql`
                EXISTS (
                  SELECT 1
                  FROM "UserQuestionState" uqs
                  WHERE uqs."userId" = ${userId}
                    AND uqs."questionId" = q."id"
                    AND uqs."lastOutcome"::text = 'UNANSWERED'
                )
              `);
            }

            if (filter.includes(SourceFilter.NOT_SEEN)) {
              sourceConditions.push(Prisma.sql`
                NOT EXISTS (
                  SELECT 1
                  FROM "UserQuestionState" uqs
                  WHERE uqs."userId" = ${userId}
                    AND uqs."questionId" = q."id"
                )
              `);
            }

            if (!sourceConditions.length) {
              throw new BadRequestException(
                'منبع فیلتر اشتباه است.',
              );
            }

            conditions.push(
              Prisma.sql`(
                ${Prisma.join(sourceConditions, ' OR ')}
              )`,
            );
          }

          // Only questions marked by this user.
          if (fromMarked) {
            conditions.push(Prisma.sql`
              EXISTS (
                SELECT 1
                FROM "saved-questions" sq
                WHERE sq."userId" = ${userId}
                  AND sq."questionId" = q."id"
              )
            `);
          }

          const where = Prisma.join(conditions, ' AND ');

          // Count eligible questions for this bank.
          const counts = await tx.$queryRaw<
            { count: bigint }[]
          >(Prisma.sql`
            SELECT COUNT(*) AS count
            FROM "questions" q
            WHERE ${where}
          `);

          const eligibleCount = Number(counts[0].count);

          // Reject the entire request if this bank has too few.
          if (eligibleCount < bank.count) {
            throw new BadRequestException('تعداد سوالات درخواستی از تعداد موجود بیشتر است.');
          }

          // Select exactly the requested count randomly.
          const questions = await tx.$queryRaw<
            { id: string; bankId: string }[]
          >(Prisma.sql`
            SELECT q."id", q."bankId"
            FROM "questions" q
            WHERE ${where}
            ORDER BY RANDOM()
            LIMIT ${bank.count}
          `);

          result.push({
            bankId: bank.bankId,
            requestedCount: bank.count,
            questions,
          });
        }

        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      },
    );
  }

  private async validateSameCourse(bankIds: string[]): Promise<string> {
    const uniqueBankIds = [...new Set(bankIds)];

    if (uniqueBankIds.length === 0) {
      throw new BadRequestException(
        'حداقل باید یک بانک سوال انتخاب شود.',
      );
    }

    const rows = await this.prisma.$queryRaw<
      { bankId: string; courseId: string | null }[]
    >`
      WITH RECURSIVE ancestors AS (
        SELECT
          b.id AS "bankId",
          c.id AS "categoryId",
          c.type,
          0 AS depth
        FROM banks b
        JOIN categories c ON c.id = b."categoryId"
        WHERE b.id IN (${Prisma.join(uniqueBankIds)})

        UNION ALL

        SELECT
          a."bankId",
          parent.id AS "categoryId",
          parent.type,
          a.depth + 1
        FROM ancestors a
        JOIN category_relations cr
          ON cr."childId" = a."categoryId"
        JOIN categories parent
          ON parent.id = cr."parentId"
        WHERE a.type <> 'COURSE'
      )
      SELECT
        "bankId",
        MIN("categoryId") FILTER (WHERE type = 'COURSE')
          AS "courseId"
      FROM ancestors
      GROUP BY "bankId"
    `;

    if (rows.length !== uniqueBankIds.length) {
      throw new BadRequestException(
        'تعدادی از بانک سوالات یافت نشده اند یا به دسته ای تعلق ندارند.',
      );
    }

    const courseIds = new Set(
      rows.map((row) => row.courseId),
    );

    if (courseIds.size !== 1 || courseIds.has(null)) {
      throw new BadRequestException(
        'تمامی بانک سوالات باید متعلق به یک درس باشند.',
      );
    }

    return [...courseIds][0]!;
  }
}
