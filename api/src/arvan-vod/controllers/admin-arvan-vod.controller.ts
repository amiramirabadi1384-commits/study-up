import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import { ArvanVodService } from '../arvan-vod.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { CreateUrlDto } from '../dto/create-url.dto.js';
import { Throttle } from '@nestjs/throttler';

@Controller('admin/arvan-vod')
@RoleDec(Role.ADMIN)
export class AdminArvanVodController {
  constructor(
    private readonly arvanVodService: ArvanVodService,
  ) { }

  @Post("public/:id")
  public(@Param("id", ParseUUIDPipe) id: string) {
    return this.arvanVodService.public(id)
  }

  @Post("un-public/:id")
  unPublic(@Param("id", ParseUUIDPipe) id: string) {
    return this.arvanVodService.unPublic(id)
  }

  @Post('upload-config')
  getUploadConfig(@Body() dto: CreateUrlDto) {
    return this.arvanVodService.getUploadEndpoint(dto)
  }

  @Post('videos')
  @Throttle({
    default: {
      ttl: 60_000,
      limit: 20
    },
  })
  createVideo(
    @Body()
    body: {
      fileId: string;
      title: string;
      description?: string;
      categoryId: string
    },
  ) {
    if (!body.fileId) {
      throw new BadRequestException('ارائه آیدی فایل از آروان ویدئو ضروری است.');
    }

    if (!body.title) {
      throw new BadRequestException('عنوان ویدئو باید وارد شود.');
    }

    return this.arvanVodService.createVideo(body);
  }

  @Get('videos')
  getVideos(@Query('page', PaginationPipePipe) page: number, @Query("search", SearchQueryPipe) search: string, @Query('category', ParseUUIDPipe) category: string) {
    return this.arvanVodService.getVideos(page, search, category);
  }

  @Get('videos/:videoId')
  getVideo(
    @Param('videoId') videoId: string,
    @Query('url', ParseBoolPipe) url: boolean
  ) {
    return this.arvanVodService.getVideo(videoId, url);
  }


  @Delete(":id")
  remove(@Param("id") videoId: string) {
    return this.arvanVodService.remove(videoId)
  }
}