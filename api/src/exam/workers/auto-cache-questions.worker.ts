import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { AUTO_CACHE_QUESTIONS } from "../queue/name.queue.js";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Inject, NotFoundException } from "@nestjs/common";
import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";

@Processor(AUTO_CACHE_QUESTIONS)
export class AutoCacheQueue extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) {
        super()
    }

    async process(job: Job, token?: string): Promise<any> {
        const { examId } = job.data
        const now = new Date()

        const exam = await this.prisma.exam.findUnique({
            where: {
                id: examId
            }
        })
        if (!exam) {
            throw new NotFoundException("exam not found");
        }

        let nextPage = true;
        const limit = 10;
        let page = 1

        while (nextPage) {
            const questions = await this.prisma.examQuestion.findMany({
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
                skip: limit * (page - 1),
                take: limit + 1,
                orderBy: [
                    { order: "asc" }
                ]
            })

            nextPage = limit < questions.length
            if(nextPage) questions.pop()

            const key = `exam:${examId}:page:${page}`
            // same shape UserAttemptService.getQuestionsFromCache reads: plain questions
            const result = {
                questions: questions.map(q => q.question),
                nextPage
            }

            const untilEnd = exam.endAt ? Math.max(0, exam.endAt.getTime() - now.getTime()) : 0
            await this.cacheManager.set(key, result, untilEnd + exam.duration*1_000 + 60_000)

            page++
        }
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job){
        console.error("[failed on auto cache]: ", job.failedReason)
    }
}