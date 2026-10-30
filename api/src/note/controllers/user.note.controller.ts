import {
  Controller,
  ForbiddenException,
  Get,
  Param,
} from '@nestjs/common';
import { NoteService } from '../note.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { ContentType, Role } from '@prisma/client';
import { AccessService } from '../../access/access.service.js';
import { User } from '../../common/decorators/user.decorator.js';

@Controller('user/notes')
@RoleDec(Role.USER)
export class UserNoteController {
  constructor(
    private readonly noteService: NoteService,
    private readonly accessService: AccessService
  ) { }

  @Get(":id")
  async findOne(@Param('id') id: string, @User("id") userId:string) {
    await this.accessService.assertCanAccessNote(userId, id)
    return this.noteService.getSignedUrl(id);
  }
}