import { Module } from '@nestjs/common';
import { DaysService } from './days.service.js';
import { AdminDaysController } from './controllers/admin-days.controller.js';
import { UserDaysController } from './controllers/user-days.controller.js';
import { QuestionModule } from '../question/question.module.js';

@Module({
  imports: [QuestionModule],
  controllers: [AdminDaysController, UserDaysController],
  providers: [DaysService],
})
export class DaysModule {}
