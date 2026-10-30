import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, UseInterceptors, BadRequestException, UploadedFile } from '@nestjs/common';
import { QuestionService } from '../services/question.service.js';
import { CreateQuestionDto } from '../dto/create-question.dto.js';
import { UpdateQuestionDto } from '../dto/update-question.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { UpdateOptionDto } from '../dto/update-option.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Controller('admin/questions')
@RoleDec(Role.ADMIN)
export class AdminQuestionController {
  constructor(
    private readonly questionService: QuestionService,
  ) { }

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @Get("exam/:id")
  findAll(@Param("id", ParseUUIDPipe) bankId: string, @Query("page", PaginationPipePipe) page: number, @Query('search', SearchQueryPipe) search: string) {
    return this.questionService.findAll(bankId, search, page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  @Patch('option/:id')
  updateOption(@Param('id') optionId: string, @Body() updateOptionDto: UpdateOptionDto) {
    return this.questionService.updateOption(optionId, updateOptionDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionService.update(id, updateQuestionDto);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionService.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './tmp/uploads',
        filename: (_req, file, callback) => {
          callback(
            null,
            `${randomUUID()}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('فایل آپلودی باید عکس باشد.'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async addImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.questionService.addImage(id, file);
  }

  @Delete(':id/image')
  async removeImage(@Param('id') id: string) {
    return this.questionService.removeImage(id);
  }
}
