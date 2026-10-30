import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { ArvanVodService } from '../arvan-vod.service.js';
import { PaginationPipePipe } from '../../common/pipes/pagination.pipe.js';
import { SearchQueryPipe } from '../../common/pipes/search.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('arvan-vod')
@Public()
export class ArvanVodController {
  constructor(
    private readonly arvanVodService: ArvanVodService,
  ) { }

  @Get('videos')
  getVideos(@Query('page', PaginationPipePipe) page: number, @Query("search", SearchQueryPipe) search: string, @Query('category', ParseUUIDPipe) category: string) {
    return this.arvanVodService.getVideos(page, search, category, true);
  }

  @Get('videos/:videoId')
  async getVideo(
    @Param('videoId') videoId: string,
  ) {
    return this.arvanVodService.getVideo(videoId, false, true);
  }
}