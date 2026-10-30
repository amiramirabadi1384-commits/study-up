import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { AUTO_ADD_TO_BANK, AUTO_CALCULATE_RESULT } from "../queue/name.queue.js";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service.js";
import { NotFoundException } from "@nestjs/common";
import { ExamStatus } from "@prisma/client";

@Processor(AUTO_CALCULATE_RESULT)
export class AutoCalculateResultWorker extends WorkerHost {
    constructor(
        private prisma: PrismaService,
        @InjectQueue(AUTO_ADD_TO_BANK) private autoAddToBank: Queue
    ) {
        super()
    }

    async process(job: Job) {
        const examId: string = typeof job.data === "string" ? job.data : job.data.examId

        const exam = await this.prisma.exam.findUnique({
            where: {
                id: examId
            }
        })

        if (!exam) {
            throw new NotFoundException("couldn't find the exam with id: " + examId)
        }

        if (!exam.count || exam.count < 1) {
            throw new NotFoundException("exam has no questions: " + examId)
        }

        const attempts = await this.prisma.attempt.findMany({
            where: {
                examId
            },
            select: {
                id: true,
                result: true
            }
        })

        let newAttempts = []

        for (const attempt of attempts) {
            if (!attempt.result) {
                const count = exam.count
                const answers = await this.prisma.attemptAnswer.findMany({
                    where: {
                        attemptId: attempt.id,
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

                const result = await this.prisma.result.upsert({
                    where: {
                        attemptId: attempt.id,
                    },
                    update: {},
                    create: {
                        attemptId: attempt.id,
                        correct,
                        wrong,
                        points: correct / count * 100,
                        pointsWithMinus: (correct * 3 - wrong) / (count * 3) * 100,
                        totalCount: count,
                        examId
                    }
                });

                newAttempts.push({
                    ...attempt,
                    result
                })
            }

            else {
                newAttempts.push(attempt)
            }
        }

        const results: any = await this.prisma.$queryRaw`
            SELECT
                id,
                points,
                RANK() OVER (ORDER BY points DESC) AS ranking
            FROM "results"
            WHERE "examId" = ${examId}
        `;

        let points = newAttempts.map(a => Number(a.result!.points));
        let sum = points.reduce(
            (acc, point) => acc + point,
            0
        );
        let count = newAttempts.length

        if (count === 0) {
            return
        }

        let mean = sum / count

        let varins = 0;
        for (const attempt of newAttempts) {
            varins += Math.pow(+attempt.result!.points - mean, 2)
        }
        const theta = Math.sqrt(varins / count)

        await this.prisma.$transaction((async (tx) => {
            for (const result of results) {
                const z = theta === 0 ? 0 : (result.points - mean) / theta
                const score = 5000 + z * 1000

                await tx.result.update({
                    where: { id: result.id },
                    data: {
                        rank: result.ranking,
                        score
                    }
                })
            }
            await tx.exam.update({
                where: { id: examId },
                data: {
                    status: ExamStatus.RESULTED
                }
            })
        }))

        await this.autoAddToBank.add("add-to-bank", {examId}, {
            jobId: "bank-"+examId,
        })
    }

    @OnWorkerEvent("failed")
    onfailed(job: Job) {
        console.error("[auto resulting exam failed]: ", job.failedReason)
    }
}