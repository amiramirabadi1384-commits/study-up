import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AttemptStatus } from "@prisma/client";
import { AUTO_SUBMIT } from "../queue/name.queue.js";

@Processor(AUTO_SUBMIT, {concurrency: 5})
export class AutoSubmitProcessor extends WorkerHost{
    constructor(private prisma:PrismaService){
        super();
    }

    async process(job: Job){
        const { attemptId } = job.data;

        const attempt = await this.prisma.attempt.findUnique({
            where: {
                id: attemptId
            }
        })

        if(!attempt){
            throw new NotFoundException("attempt not found")
        }

        if(attempt.status === AttemptStatus.SUBMITTED){
            return{
                success: true
            }
        }
        if(attempt.expireAt > new Date()){
            throw new BadRequestException("not submitting time yet.")
        }

        await this.prisma.attempt.update({
            where: {
                id: attemptId
            },
            data: {
                status: AttemptStatus.SUBMITTED
            }
        })

        return {
            success: true
        }
    }

    @OnWorkerEvent("failed")
    onFail(job: Job){
        console.error("[attempt-id]:",job.data)
        console.error("[auto-submit-error]", job.failedReason)
    }
}