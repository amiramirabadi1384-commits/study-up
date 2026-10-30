import { Module } from '@nestjs/common';
import { ArvanVodService } from './arvan-vod.service.js';
import { AdminArvanVodController } from './controllers/admin-arvan-vod.controller.js';
import { BullModule } from '@nestjs/bullmq';
import { CheckVideoWorker } from './workers/check-video.worker.js';
import { UserArvanVodController } from './controllers/user-arvan-vod.controller.js';
import { ArvanVodController } from './controllers/arvan-vod.controller.js';
import { CHECK_VIDEO_STATE } from './queue/name.queue.js';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [BullModule.registerQueue({name: CHECK_VIDEO_STATE}), HttpModule],
  controllers: [AdminArvanVodController, UserArvanVodController, ArvanVodController],
  providers: [ArvanVodService, CheckVideoWorker],
  exports: [ArvanVodService]
})
export class ArvanVodModule {}
