import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { AUTO_REMOVE } from "../queue/name.queue.js";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service.js";

@Processor(AUTO_REMOVE)
export class AutoRemoveWorker extends WorkerHost{
    constructor(private prisma: PrismaService){
        super()
    }
    async process(job: Job) {
        const {examId} = job.data

        await this.prisma.$transaction(async (tx) => {
            const exam = await tx.exam.findUnique({
                where: {
                    id: examId
                }
            })

            if(!exam){
                // already removed by the user: nothing to do
                return
            }

            if(new Date() >= new Date(86_400_000 + exam.createdAt.getTime())){
                const attempt = await tx.attempt.findFirst({
                    where: {
                        examId
                    }
                })

                if(!attempt){
                    await tx.exam.delete({
                        where: {
                            id: examId
                        }
                    })
                }
            }
        })

        return
    }

    @OnWorkerEvent("failed")
    onfailed(job: Job){
        console.error("[auto remove exam worker]: ", job.failedReason)
    }
}