import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateQuestionDto } from '../dto/create-question.dto.js';
import { UpdateQuestionDto } from '../dto/update-question.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateOptionDto } from '../dto/update-option.dto.js';
import { NoteService } from '../../note/note.service.js';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { UpsertUserQuestionStateDto } from '../dto/upsert-q-state.dto.js';
import { AnswerState } from '@prisma/client';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService, private noteService: NoteService) { }
  private limit = 10

  async create(createQuestionDto: CreateQuestionDto) {
    
    const question = await this.prisma.$transaction(async (tx) => {
      const bank = await tx.bank.findUnique({
        where: { id: createQuestionDto.bankId },
        select: { id: true }
      })

      if (!bank) {
        throw new NotFoundException("بانک سوال مورد نظر یافت نشد.")
      }

      const question = await tx.question.create({
        data: {
          text: createQuestionDto.text,
          bankId: createQuestionDto.bankId,
          answer: createQuestionDto.answer,

          options: {
            create: createQuestionDto.options.map((option) => ({
              text: option.text,
              isTrue: option.isTrue,
            })),
          },
        },

        include: {
          options: true,
        },
      });

      await tx.bank.update({
        where: {
          id: createQuestionDto.bankId
        },
        data: {
          count: { increment: 1 }
        }
      })

      return question
    })

    return {
      success: true,
      data: question
    }
  }

  async findAll(bankId: string, search: string | undefined, page: number = 1) {
    const questions = await this.prisma.question.findMany({
      where: {
        bankId,
        ...(search && {
          OR: [
            {
              text: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              options: {
                some: {
                  text: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          ]
        })
      },
      include: {
        options: true
      },
      skip: this.limit * (page - 1),
      take: this.limit + 1,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    })

    const nextPage = this.limit < questions.length
    if (nextPage) questions.pop()

    const questionsWithUrls = await Promise.all(
      questions.map(async (question) => {
        const imageUrl = question.img
          ? await this.noteService.getSignedUrlImg(question.img)
          : null;

        return {
          ...question,
          img: imageUrl,
        };
      }),
    );

    return {
      success: true,
      data: {
        questions: questionsWithUrls,
        nextPage
      }
    }
  }

  async findAllExams(examId: string, search: string | undefined, page: number = 1) {
    const questions = await this.prisma.question.findMany({
      where: {
        exams: {
          some: {
            examId
          }
        },
        ...(search && {
          OR: [
            {
              text: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              options: {
                some: {
                  text: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            }
          ]
        })
      },
      include: {
        options: true
      },
      skip: this.limit * (page - 1),
      take: this.limit + 1,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    })

    const nextPage = this.limit < questions.length
    if (nextPage) questions.pop()

    const questionsWithUrls = await Promise.all(
      questions.map(async (question) => {
        const imageUrl = question.img
          ? await this.noteService.getSignedUrlImg(question.img)
          : null;

        return {
          ...question,
          img: imageUrl,
        };
      }),
    );

    return {
      success: true,
      data: {
        questions: questionsWithUrls,
        nextPage
      }
    }
  }

  async findAllDays(dayId: string, page: number = 1) {
    const questions = await this.prisma.question.findMany({
      where: {
        days: {
          some: {
            dayId
          }
        }
      },
      include: {
        options: true
      },
      skip: this.limit * (page - 1),
      take: this.limit + 1,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    })

    const nextPage = this.limit < questions.length
    if (nextPage) questions.pop()

    const questionsWithUrls = await Promise.all(
      questions.map(async (question) => {
        const imageUrl = question.img
          ? await this.noteService.getSignedUrlImg(question.img)
          : null;

        return {
          ...question,
          img: imageUrl,
        };
      }),
    );

    return {
      success: true,
      data: {
        questions: questionsWithUrls,
        nextPage
      }
    }
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: {
        id,
      },
      include: {
        options: true
      }
    })

    if (!question) {
      throw new NotFoundException("سوال مورد نظر یافت نشده است.")
    }

    return {
      success: true,
      data: { ...question, img: await this.getSignedUrl(question.img) }
    }
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    const question = await this.prisma.question.update({
      where: {
        id
      },
      data: {
        text: updateQuestionDto.text,
        answer: updateQuestionDto.answer,
      }
    })

    return {
      success: true,
      data: question
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      select: { id: true, img: true }
    })

    if (!existing) {
      throw new NotFoundException("سوال مورد نظر یافت نشده است.")
    }

    await this.prisma.$transaction(async (tx) => {
      const question = await tx.question.delete({
        where: {
          id
        },
        select: {
          id: true,
          bankId: true
        }
      })

      // official questions may not belong to a bank
      if (question.bankId) {
        await tx.bank.update({
          where: {
            id: question.bankId
          },
          data: {
            count: { decrement: 1 }
          }
        })
      }
    })

    // Remove the file only after the row is gone (and never block deletion without an image).
    if (existing.img) {
      await this.noteService.deleteImg(existing.img).catch((err) => {
        console.error("[question-image-remove-error]:", err)
      })
    }

    return {
      success: true,
      data: { id }
    }

  }

  async updateOption(optionId: string, updateOptionDto: UpdateOptionDto) {
    const option = await this.prisma.option.update({
      where: { id: optionId },
      data: updateOptionDto
    })

    return {
      success: true,
      data: option
    }
  }

  async saveQuestion(userId: string, questionId: string) {
    const existing = await this.prisma.savedQuestion.findFirst({
      where: { userId, questionId }
    })

    const saved = existing ?? await this.prisma.savedQuestion.create({
      data: {
        userId,
        questionId
      }
    })

    return {
      success: true,
      data: saved
    }
  }

  async getSavedQuestions(userId: string, page: number = 1) {
    const saved = await this.prisma.question.findMany({
      where: {
        savedQuestions: {
          some: {
            userId
          }
        },
      },
      select: {
        id: true,
        text: true,
        img: true,
        bank: {
          select: {
            category: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: [
        { id: "asc" }
      ],
      skip: (page - 1) * this.limit,
      take: this.limit + 1
    })

    const nextPage = this.limit < saved.length
    if (nextPage) saved.pop()

    const questionsWithUrls = await Promise.all(
      saved.map(async (question) => {
        const imageUrl = question.img
          ? await this.noteService.getSignedUrlImg(question.img)
          : null;

        return {
          ...question,
          img: imageUrl,
        };
      }),
    );

    return {
      success: true,
      data: {
        saved: questionsWithUrls,
        nextPage
      }
    }
  }

  async addImage(questionId: string, file: Express.Multer.File) {
    const question = await this.prisma.question.findUnique({
      where: {
        id: questionId
      }
    })

    if (!question) {
      throw new NotFoundException("سوال مورد نظر یافت نشده است.")
    }

    const oldKey = question.img

    const extension = extname(file.originalname);
    const key = `questions/${questionId}/${randomUUID()}${extension}`;

    try {
      await this.noteService.uploadImg(file, key);

      const updatedQuestion = await this.prisma.question.update({
        where: {
          id: questionId,
        },
        data: {
          img: key,
        },
      });

      // the old file is only removed once the new one is safely stored
      if (oldKey) {
        await this.noteService.deleteImg(oldKey).catch(() => { });
      }

      return {
        success: true,
        data: updatedQuestion,
      };
    } catch (error) {
      // If DB update fails after upload, don't leave orphaned object
      await this.noteService.deleteImg(key).catch(() => { });

      throw new InternalServerErrorException("خطایی در آپلود فایل رخ داده است.")
    }
    finally {
      unlink(file.path).catch(() => null)
    }
  }

  async removeImage(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        img: true,
      },
    });

    if (!question) {
      throw new NotFoundException('سوال مورد نظر یافت نشد.');
    }

    if (!question.img) {
      throw new BadRequestException('این سوال تصویر ندارد.');
    }

    await this.noteService.deleteImg(question.img);

    const updatedQuestion = await this.prisma.question.update({
      where: {
        id
      },
      data: {
        img: null,
      },
    });

    return {
      success: true,
      data: updatedQuestion,
    };
  }

  async upsertQuestionState(questionId:string, userId:string, dto: UpsertUserQuestionStateDto){
    const exists = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true }
    })

    if (!exists) {
      throw new NotFoundException("سوال مورد نظر یافت نشده است.")
    }

    let answerState:AnswerState = AnswerState.UNANSWERED
    if(dto.optionId){
      const option = await this.prisma.option.findFirst({
        where: {
          id: dto.optionId
        }
      })

      if(!option){
        throw new BadRequestException("گزینه مورد نظر یافت نشده است.")
      }
      if(option.questionId !== questionId){
        throw new BadRequestException("این گزینه به این سوال تغلق ندارد.")
      }

      answerState = option.isTrue?AnswerState.CORRECT:AnswerState.WRONG
    }

    const state = await this.prisma.userQuestionState.upsert({
      where: {
        userId_questionId: {
          questionId,
          userId
        }
      },
      create: {
        questionId,
        userId,
        lastOutcome: answerState,
        ...(answerState === AnswerState.CORRECT && {
          timesCorrect: 1
        }),
        ...(answerState === AnswerState.WRONG && {
          timesWrong: 1
        }),
        ...(answerState === AnswerState.UNANSWERED && {
          timesUnAnswered: 1
        })
      },
      update: {
        lastOutcome: answerState,
        ...(answerState === AnswerState.CORRECT && {
          timesCorrect: {increment: 1}
        }),
        ...(answerState === AnswerState.WRONG && {
          timesWrong: {increment: 1}
        }),
        ...(answerState === AnswerState.UNANSWERED && {
          timesUnAnswered: {increment: 1}
        })
      }
    })

    return {
      success: true,
      data: state
    }
  }

  private async getSignedUrl(img: string | null) {
    if (img) {
      return await this.noteService.getSignedUrlImg(img)
    }

    return null
  }
}
