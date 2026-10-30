import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { NoteService } from '../note.service.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('notes')
@Public()
export class NoteController {
  constructor(
    private readonly noteService: NoteService,
  ) { }
  @Get()
  findAll(@Query('page', PaginationPipePipe) page: number, @Query("search", SearchQueryPipe) search: string, @Query('category', ParseUUIDPipe) category: string) {
    return this.noteService.findAll(page, search, category);
  }

  @Get(":id")
  async findOne(@Param('id') id: string) {
    return this.noteService.findOne(id);
  }
}