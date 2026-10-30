import { Module } from '@nestjs/common';
import { ExamService } from './services/exam.service.js';
import { AdminExamController } from './controllers/admin-exam.controller.js';
import { UserExamController } from './controllers/user-exam.controller.js';
import { UserAttemptController } from './controllers/user-attempt.controller.js';
import { BullModule } from '@nestjs/bullmq';
import { AUTO_ADD_TO_BANK, AUTO_CACHE_QUESTIONS, AUTO_CALCULATE_RESULT, AUTO_REMOVE, AUTO_SUBMIT, AUTO_UPSERT_QUESTION_STATE } from './queue/name.queue.js';
import { AutoSubmitProcessor } from './workers/auto-submit.worker.js';
import { AutoRemoveWorker } from './workers/auto-remove.worker.js';
import { UserExamService } from './services/user-exam.service.js';
import { UserAttemptService } from './services/user-attempt.service.js';
import { AutoUpsertQuestionState } from './workers/auto-upsert-question-state.worker.js';
import { AutoCacheQueue } from './workers/auto-cache-questions.worker.js';
import { AutoCalculateResultWorker } from './workers/auto-calculate-result.js';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: AUTO_SUBMIT },
      { name: AUTO_REMOVE },
      { name: AUTO_UPSERT_QUESTION_STATE },
      { name: AUTO_CACHE_QUESTIONS },
      { name: AUTO_CALCULATE_RESULT },
      { name: AUTO_ADD_TO_BANK },
    ),
  ],
  controllers: [AdminExamController, UserExamController, UserAttemptController],
  providers: [
    ExamService,
    AutoSubmitProcessor,
    AutoRemoveWorker,
    UserExamService,
    UserAttemptService,
    AutoUpsertQuestionState,
    AutoCacheQueue,
    AutoCalculateResultWorker,
  ],
})
export class ExamModule {}
