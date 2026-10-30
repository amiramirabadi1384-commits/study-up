import { Module } from '@nestjs/common';
import { QuestionService } from './services/question.service.js';
import { AdminQuestionController } from './controllers/admin-question.controller.js';
import { NoteModule } from '../note/note.module.js';
import { UserQuestionController } from './controllers/user-question.controller.js';

@Module({
  imports: [NoteModule],
  controllers: [AdminQuestionController, UserQuestionController],
  providers: [QuestionService],
  exports: [QuestionService]
})
export class QuestionModule {}
