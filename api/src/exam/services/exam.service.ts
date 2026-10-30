import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from '../dto/create-exam.dto.js';
import { UpdateExamDto } from '../dto/update-exam.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CategoryType, ExamStatus, ExamType } from '@prisma/client';
import { AddQuestionsDto } from '../dto/add-questions.dto.js';

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) { }

  async publish(examId: string) {
    const questionCount = await this.prisma.examQuestion.count({ where: { examId } })

    if (questionCount === 0) {
      throw new BadRequestException("آزمون بدون سوال قابل انتشار نیست.")
    }

    await this.prisma.exam.update({
      where: {
        id: examId,
        type: ExamType.OFFICIAL
      },
      data: {
        status: ExamStatus.LIVE
      }
    })

    return {
      success: true,
      data: {
        id: examId
      }
    }
  }

  async unPublish(examId: string) {
    await this.prisma.exam.update({
      where: {
        id: examId,
        type: ExamType.OFFICIAL
      },
      data: {
        status: ExamStatus.DRAFTED
      }
    })

    return {
      success: true,
      data: {
        id: examId
      }
    }
  }

  async public(examId: string) {
    await this.prisma.exam.update({
      where: {
        id: examId,
        type: ExamType.OFFICIAL
      },
      data: {
        public: true
      }
    })

    return {
      success: true,
      data: {
        id: examId
      }
    }
  }

  async unPublic(examId: string) {
    await this.prisma.exam.update({
      where: {
        id: examId,
        type: ExamType.OFFICIAL
      },
      data: {
        public: false
      }
    })

    return {
      success: true,
      data: {
        id: examId
      }
    }
  }

  async addQuestions(examId: string, addQuestionsDto: AddQuestionsDto) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        type: ExamType.OFFICIAL
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }

    const requestedIds = [...new Set(addQuestionsDto.questions)]

    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: requestedIds }
      },
      select: {
        id: true,
        bank: {
          select: {
            category: {
              select: {
                id: true,
                type: true,
                parents: {
                  select: {
                    parent: {
                      select: {
                        id: true,
                        type: true,
                        parents: {
                          select: {
                            parent: {
                              select: {
                                id: true,
                                type: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          }
        }
      }
    })

    if (questions.length !== requestedIds.length) {
      throw new BadRequestException("یک یا تعدادی از سوالات یافت نشدند.")
    }

    const alreadyAdded = await this.prisma.examQuestion.count({
      where: { examId, questionId: { in: requestedIds } }
    })

    if (alreadyAdded > 0) {
      throw new BadRequestException("یک یا تعدادی از سوالات قبلا به آزمون اضافه شده اند.")
    }

    for (const question of questions) {
      if (!question.bank) {
        throw new BadRequestException("تمام سوالات باید متعلق به یک بانک سوال باشند.")
      }

      const category = question.bank.category
      let belongsToCourse = false;

      if (category.type === CategoryType.TOPIC) {
        belongsToCourse = category.parents.some(
          ({ parent }) =>
            parent.type === CategoryType.COURSE &&
            parent.id === exam.courseId,
        );
      } else if (category.type === CategoryType.SUB_TOPIC) {
        belongsToCourse = category.parents.some(({ parent: topic }) =>
          topic.type === CategoryType.TOPIC &&
          topic.parents.some(
            ({ parent: course }) =>
              course.type === CategoryType.COURSE &&
              course.id === exam.courseId,
          ),
        );
      }

      if (!belongsToCourse) {
        throw new BadRequestException(
          "تمام سوالات باید متعلق به درس مربوط به این آزمون باشند.",
        );
      }
    }

    const lastOrder = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
      },
      select: {
        order: true
      },
      orderBy: {
        order: "desc"
      }
    })

    // Questions and the exam's question count (used for scoring) change together.
    const [examQuestions] = await this.prisma.$transaction([
      this.prisma.examQuestion.createMany({
        data: questions.map((question, index) => ({
          examId,
          questionId: question.id,
          order: lastOrder ? lastOrder.order + index + 1 : index
        }))
      }),
      this.prisma.exam.update({
        where: { id: examId },
        data: { count: { increment: questions.length } }
      })
    ])

    return {
      success: true,
      data: examQuestions
    }
  }

  async create(createExamDto: CreateExamDto) {
    const category = await this.prisma.category.findUnique({
      where: {
        id: createExamDto.categoryId
      }
    })

    if (!category) {
      throw new NotFoundException("دسته ی مورد نظر یافت نشد.")
    }
    if (
      createExamDto.startAt && createExamDto.endAt &&
      new Date(createExamDto.startAt) >= new Date(createExamDto.endAt)
    ) {
      throw new BadRequestException("زمان شروع باید قبل از زمان پایان باشد.")
    }

    const exam = await this.prisma.exam.create({
      data: {
        ...createExamDto,
        type: ExamType.OFFICIAL
      },
      select: {
        id: true
      }
    })

    return {
      success: true,
      data: exam
    }
  }

  async findAll(categoryId: string) {
    const exams = await this.prisma.exam.findMany({
      where: {
        categoryId,
        type: ExamType.OFFICIAL
      },
      select: {
        id: true,
        title: true
      }
    })

    return {
      success: true,
      data: exams
    }
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id,
        type: ExamType.OFFICIAL
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }

    return {
      success: true,
      data: exam
    }
  }

  async update(id: string, updateExamDto: UpdateExamDto) {
    if (updateExamDto.courseId) {
      const exam = await this.prisma.exam.findFirst({
        where: {
          id,
          type: ExamType.OFFICIAL
        },
        select: {
          questions: {
            select: {
              id: true
            }
          }
        }
      })

      if (!exam) {
        throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
      }
      if (exam.questions.length) {
        throw new BadRequestException("تغییر درس آزومون پس از انتخاب سوالات ممکن نمی باشد.")
      }
    }
    const exam = await this.prisma.exam.update({
      where: {
        id,
        type: ExamType.OFFICIAL
      },
      data: updateExamDto
    })

    return {
      success: true,
      data: exam
    }
  }

  async remove(id: string) {
    await this.prisma.exam.delete({
      where: {
        id,
        type: ExamType.OFFICIAL
      }
    })

    return {
      success: true,
      data: { id }
    }
  }
}
