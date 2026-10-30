import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { NoteService } from '../note.service.js';
import { CreateNoteDto } from '../dto/create-note.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { UpdateNoteDto } from '../dto/update-note.dto.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';

@Controller('admin/notes')
@RoleDec(Role.ADMIN)
export class AdminNoteController {
  constructor(
    private readonly noteService: NoteService,
  ) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './tmp/uploads',
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname);

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('فایل آپلودی باید pdf باشد.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() createNoteDto: CreateNoteDto
  ) {
    return this.noteService.upload(file, createNoteDto);
  }

  @Post("public/:id")
  public(@Param("id", ParseUUIDPipe) id: string){
    return this.noteService.public(id)
  }

  @Post("un-public/:id")
  unPublic(@Param("id", ParseUUIDPipe) id: string){
    return this.noteService.unPublic(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, updateNoteDto: UpdateNoteDto) {
    return this.noteService.update(id, updateNoteDto)
  }

  @Delete(':id')
  remove(@Param("id") id: string) {
    return this.noteService.remove(id)
  }

  @Get()
  findAll(@Query('page', PaginationPipePipe) page: number, @Query("search", SearchQueryPipe) search: string, @Query('category', ParseUUIDPipe) category: string) {
    return this.noteService.findAll(page, search, category);
  }

  @Get("url/:id")
  getUrl(@Param('id') id: string) {
    return this.noteService.getSignedUrl(id);
  }

  @Get(":id")
  findOne(@Param('id') id: string) {
    return this.noteService.findOne(id);
  }

}