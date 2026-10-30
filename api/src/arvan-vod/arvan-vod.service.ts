import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../prisma/prisma.service.js';
import { VideoStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CHECK_VIDEO_STATE } from './queue/name.queue.js';
import { CreateUrlDto } from './dto/create-url.dto.js';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios'

@Injectable()
export class ArvanVodService {
  private readonly client: AxiosInstance;
  private readonly channelId: string;
  private baseUrl: string
  private apiKey: string | undefined
  private limit = 10

  async public(id: string) {
    const video  = await this.prisma.video.findUnique({
      where: {id}
    })
    if(!video){
      throw new NotFoundException("ویدیو مورد نظر یافت نشده است.")
    }
    if(video.status !== VideoStatus.READY){
      throw new BadRequestException("وضعیت ویدیو باید آماده باشد تا عمومی شود.")
    }
    await this.prisma.video.update({
      where: {
        id
      },
      data: {
        public: true
      }
    })

    return {
      success: true,
      data: { id }
    }
  }

  async unPublic(id: string) {
    await this.prisma.video.update({
      where: {
        id
      },
      data: {
        public: false
      }
    })

    return {
      success: true,
      data: { id }
    }
  }

  constructor(
    private prisma: PrismaService,
    @InjectQueue(CHECK_VIDEO_STATE) private checkVideoQueue: Queue,
    private httpService: HttpService
  ) {
    this.apiKey = process.env.ARVAN_API_KEY;
    this.channelId = process.env.ARVAN_CHANNEL_ID ?? '';

    if (!this.apiKey) {
      throw new Error('ARVAN_API_KEY is not configured');
    }

    if (!this.channelId) {
      throw new Error('ARVAN_CHANNEL_ID is not configured');
    }

    this.baseUrl = process.env.ARVAN_API_BASE_URL ?? 'https://napi.arvancloud.com/vod/2.0'

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Apikey ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getUploadEndpoint(dto: CreateUrlDto) {
    const { filename, fileType, fileSize } = dto

    if (!filename) {
      throw new BadRequestException("نام فایل را وارد کنید.")
    }
    if (!fileSize || fileSize <= 0) {
      throw new BadRequestException("مقدار حجم فایل را درست وارد کنید.")
    }

    try {
      const url =
        `${this.baseUrl}/channels/${this.channelId}/files`;

      const response = await firstValueFrom(
        this.httpService.post(
          url,
          null,
          {
            headers: {
              Authorization: `Apikey ${this.apiKey}`,
              'Accept-Language': 'en',
              Accept: 'application/json',

              // TUS
              'Tus-Resumable': '1.0.0',

              // Tell ArvanCloud the size of the complete file
              'Upload-Length': fileSize,

              // TUS metadata
              'Upload-Metadata': this.createTusMetadata(
                filename,
                fileType,
              ),
            },
          },
        ),
      );
      const uploadUrl =
        response.headers.location ||
        response.headers.Location;

      if (!uploadUrl) {
        throw new BadGatewayException(
          'آدرسی برای اپلود در اروان پیدا نشده است.',
        );
      }

      return {
        uploadUrl,
        filename,
        fileType,
        fileSize,
      };
    } catch (error: any) {
      console.error(
        'ArvanCloud upload initialization failed:',
        error?.response?.data || error?.message,
      );

      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(
        error?.response?.data ||
        'خطایی در ایجاد آدرس آپلود پیش آمده است.',
      );
    }
  }

  private createTusMetadata(filename: string, fileType: string): string {
    const encodedFilename = Buffer.from(filename).toString('base64');

    const encodedFileType = Buffer.from(
      fileType || 'application/octet-stream',
    ).toString('base64');

    return [
      `filename ${encodedFilename}`,
      `filetype ${encodedFileType}`,
    ].join(',');
  }

  async createVideo(params: {
    fileId: string;
    title: string;
    description?: string;
    categoryId: string
  }) {
    let video = await this.prisma.video.create({
      data: params
    })

    try {
      const response = await this.client.post(
        `/channels/${this.channelId}/videos`,
        {
          title: params.title,
          description: params.description,
          file_id: params.fileId,
          convert_mode: 'auto',
        },
      );

      const arvanVideoId = response.data?.data?.id;

      if (!arvanVideoId) {
        console.log("[arvan-response]: ", response)
        throw new InternalServerErrorException("Arvan video Id is missing.")
      }

      video = await this.prisma.video.update({
        where: {
          id: video.id
        },
        data: {
          arvanVideoId,
          status: VideoStatus.PROCESSING
        }
      })

      await this.checkVideoQueue.add("check-video-state", { arvanVideoId }, {
        delay: 30_000,
        jobId: arvanVideoId
      })

      return {
        success: true,
        data: video
      }
    } catch (error: any) {
      console.error(
        'ArvanCloud error:',
        error?.response?.data,
      );

      await this.prisma.video.update({
        where: {
          id: video.id
        },
        data: {
          status: VideoStatus.FAILED
        }
      })

      throw new InternalServerErrorException(
        error?.response?.data ??
        'ArvanCloud video creation failed',
      );
    }
  }

  async getVideo(videoId: string, url: boolean = true, ready = false) {
    const video = await this.prisma.video.findUnique({
      where: {
        id: videoId,
        ...(ready && {
          status: VideoStatus.READY
        })
      },
      include: {
        category: true
      }
    })

    if (!video) {
      throw new NotFoundException("ویدئوی مورد نظر یافت نشده است.")
    }
    if (url && video.status === VideoStatus.READY) {
      const url = await this.getVideoUrl(video.arvanVideoId!)

      return {
        success: true,
        data: {
          ...video,
          url
        }
      }
    }

    return {
      success: true,
      data: video
    }

  }

  async remove(videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: {
        id: videoId,
      },
      select: {
        id: true,
        arvanVideoId: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('ویدئویی یافت نشد.');
    }

    // Already being deleted
    if (video.status === VideoStatus.DELETING) {
      throw new BadRequestException('ویدیو در حال حذف شدن است.');
    }

    if (!video.arvanVideoId) {
      await this.prisma.video.delete({
        where: {
          id: video.id,
        },
      });

      return {
        success: true,
        data: {
          id: video.id,
        },
      };
    }

    const previousStatus = video.status;

    await this.prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        status: VideoStatus.DELETING,
      },
    });

    try {
      await this.client.delete(
        `/videos/${video.arvanVideoId}`,
      );

      await this.prisma.video.delete({
        where: {
          id: video.id,
        },
      });

      return {
        success: true,
        data: {
          id: video.id,
        },
      };
    } catch (error: unknown) {
      // restore the old status so the deletion can be retried
      await this.prisma.video.update({
        where: {
          id: video.id,
        },
        data: {
          status: previousStatus,
        },
      }).catch(() => null);

      console.error(
        'ArvanCloud delete error:',
        axios.isAxiosError(error)
          ? error.response?.data
          : error,
      );

      throw new InternalServerErrorException(
        axios.isAxiosError(error)
          ? error.response?.data ?? 'ArvanCloud video deletion failed'
          : 'ArvanCloud video deletion failed',
      );
    }
  }

  async checkArvan(arvanVideoId: string) {
    const videoRes = await this.client.get(
      `/videos/${arvanVideoId}`,
    );

    const video = videoRes.data?.data;

    if (!video) {
      throw new InternalServerErrorException(
        'Invalid response from ArvanCloud',
      );
    }

    const status = video.status ?? video.convert_status;

    if (status === 'complete') {
      await this.prisma.video.updateMany({
        where: {
          arvanVideoId,
          status: VideoStatus.PROCESSING,
        },
        data: {
          status: VideoStatus.READY,
          thumbnail_url: video.thumbnail_url,
        },
      });
    } else if (status === 'failed') {
      await this.prisma.video.updateMany({
        where: {
          arvanVideoId,
          status: VideoStatus.PROCESSING,
        },
        data: {
          status: VideoStatus.FAILED,
        },
      });
    }

    return {
      status,
    };
  }

  async getVideos(page: number = 1, search: string, category: string, ready = false) {
    const videos = await this.prisma.video.findMany({
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } }
          ]
        }),
        ...(category && {
          categoryId: category
        }),
        ...(ready && {
          status: VideoStatus.READY
        })
      },
      skip: (page - 1) * this.limit,
      take: this.limit + 1,
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" }
      ]
    })

    const nextPage = this.limit < videos.length
    if (nextPage) videos.pop()

    return {
      success: true,
      data: {
        videos,
        nextPage
      }
    }
  }


  private async getVideoUrl(arvanVideoId: string) {
    try {
      const response = await this.client.get(
        `/channels/${this.channelId}/videos/${arvanVideoId}`,
      );

      const videoData = response.data.data;

      return {
        hls: videoData.hls_playlist,
        dash: videoData.dash_playlist,
      }
    } catch (error: any) {
      throw new InternalServerErrorException(
        error?.response?.data ??
        'ArvanCloud video request failed',
      );
    }
  }
}