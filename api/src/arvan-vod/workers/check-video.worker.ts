import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import { ArvanVodService } from "../arvan-vod.service.js";
import { CHECK_VIDEO_STATE } from "../queue/name.queue.js";

@Processor(CHECK_VIDEO_STATE, { concurrency: 3 })
export class CheckVideoWorker extends WorkerHost {
    constructor(
        private arvanVodService: ArvanVodService,
        @InjectQueue(CHECK_VIDEO_STATE) private checkVideoQueue: Queue
    ) {
        super()
    }
    async process(job: Job): Promise<any> {
        const { arvanVideoId, tries = 0 } = job.data

        const { status } = await this.arvanVodService.checkArvan(arvanVideoId)

        if (status === "complete" || status === "failed") {
            return {
                success: true
            }
        }

        // give up after ~4 hours of polling
        if (tries >= 480) {
            return {
                success: false
            }
        }

        // A fresh jobId is required: BullMQ silently ignores add() for an id that still exists,
        // which would stop the polling after the first check.
        await this.checkVideoQueue.add("check-video-state", { arvanVideoId, tries: tries + 1 }, {
            delay: 30_000,
            jobId: `${arvanVideoId}:${tries + 1}`
        })
    }
}