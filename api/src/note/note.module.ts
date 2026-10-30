import { Module } from '@nestjs/common';
import { NoteService } from './note.service.js';
import { AdminNoteController } from './controllers/admin.note.controller.js';
import { UserNoteController } from './controllers/user.note.controller.js';
import { NoteController } from './controllers/note.controller.js';

@Module({
  controllers: [AdminNoteController, UserNoteController, NoteController],
  providers: [NoteService],
  exports: [NoteService]
})
export class NoteModule {}
