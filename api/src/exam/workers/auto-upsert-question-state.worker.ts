import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { AUTO_UPSERT_QUESTION_STATE } from "../queue/name.queue.js";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NotFoundException } from "@nestjs/common";
import { AnswerState } from "@prisma/client";

@Processor(AUTO_UPSERT_QUESTION_STATE)
export class AutoUpsertQuestionState extends WorkerHost {
    constructor(private prisma: PrismaService) {
        super()
    }

    async process(job: Job, token?: string): Promise<any> {
        const { attemptId } = job.data

        const attempt = await this.prisma.attempt.findUnique({
            where: {
                id: attemptId
            },
            select: {
                userId: true,
                exam: {
                    select: {
                        questions: true
                    }
                }
            }
        })

        if (!attempt) {
            throw new NotFoundException("تلاش مورد نظر یافت نشده است.")
        }

        const attemptAnswers = await this.prisma.attemptAnswer.findMany({
            where: {
                attemptId
            },
            select: {
                questionId: true,
                option: {
                    select: {
                        isTrue: true
                    }
                }
            }
        })
        const mappedAnswers = new Map<string, boolean>(attemptAnswers.map(aa => (
            [aa.questionId, aa.option.isTrue]
        )))

        // exam.questions are ExamQuestion rows: the real question id is questionId (not id)
        const questions = new Map<string, AnswerState>(attempt.exam.questions.map(q => {
            if (mappedAnswers.has(q.questionId)) {
                if (mappedAnswers.get(q.questionId)) {
                    return ([q.questionId, AnswerState.CORRECT])
                }
                else {
                    return ([q.questionId, AnswerState.WRONG])
                }
            }
            else {
                return ([q.questionId, AnswerState.UNANSWERED])
            }
        }))

        for (const question of attempt.exam.questions) {
            const questionId = question.questionId
            const answerState = questions.get(questionId);
            if (!answerState) {
                throw new NotFoundException("couldn't find the question from the map");
            }
            await this.prisma.userQuestionState.upsert({
                where: {
                    userId_questionId: {
                        userId: attempt.userId,
                        questionId
                    }
                },
                create: {
                    questionId,
                    userId: attempt.userId,
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
                        timesCorrect: { increment: 1 }
                    }),
                    ...(answerState === AnswerState.WRONG && {
                        timesWrong: { increment: 1 }
                    }),
                    ...(answerState === AnswerState.UNANSWERED && {
                        timesUnAnswered: { increment: 1 }
                    })
                }
            })
        }
    }

    @OnWorkerEvent("failed")
    onFail(job: Job) {
        console.error("[attempt-id]:", job.data)
        console.error("[auto-upsert-question-state-error]", job.failedReason)
    }
}