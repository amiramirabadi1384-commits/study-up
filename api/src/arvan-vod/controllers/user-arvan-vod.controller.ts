import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { ArvanVodService } from '../arvan-vod.service.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { User } from '../../common/decorators/user.decorator.js';
import { AccessService } from '../../access/access.service.js';

@Controller('user/arvan-vod')
@RoleDec(Role.USER)
export class UserArvanVodController {
  constructor(
    private readonly arvanVodService: ArvanVodService,
    private accessService: AccessService
  ) { }

  @Get('videos')
  getVideos(@Query('page', PaginationPipePipe) page: number, @Query("search", SearchQueryPipe) search: string, @Query('category', ParseUUIDPipe) category: string) {
    return this.arvanVodService.getVideos(page, search, category, true);
  }

  @Get('videos/:videoId')
  async getVideo(
    @Param('videoId') videoId: string,
    @User('id') userId: string
  ) {
    await this.accessService.assertCanAccessVideo(userId, videoId)
    return this.arvanVodService.getVideo(videoId, true, true);
  }
}