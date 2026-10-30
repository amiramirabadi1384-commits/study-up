// arvan-storage.service.ts

import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { getSignedUrl, S3RequestPresigner } from '@aws-sdk/s3-request-presigner'
import { createRequest } from '@aws-sdk/util-create-request'
import { formatUrl } from '@aws-sdk/util-format-url'
import path from 'path';

@Injectable()
export class NoteService {
  private bucket = process.env.ARVAN_BUCKET
  private readonly s3 = new S3Client({
    region: 'default',
    endpoint: process.env.ARVAN_BUCKET_ENDPOINT,
    credentials: {
      accessKeyId: process.env.ARVAN_ACCESS_KEY!,
      secretAccessKey: process.env.ARVAN_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
  private limit = 10
  constructor(private prisma: PrismaService) { }

  async public(id: string){
    await this.prisma.note.update({
      where: {
        id
      },
      data:{
        public: true
      }
    })

    return {
      success: true,
      data: {id}
    }
  }

  async unPublic(id: string){
    await this.prisma.note.update({
      where: {
        id
      },
      data:{
        public: false
      }
    })

    return {
      success: true,
      data: {id}
    }
  }

  async upload(file: Express.Multer.File, createNoteDto: CreateNoteDto) {
    const stream = createReadStream(file.path);
    const Key = `${randomUUID()}${path.extname(file.originalname)}`

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key,
          Body: stream,
          ContentType: file.mimetype,
        }),
      );

      let note: { id: string }
      try {
        note = await this.prisma.note.create({
          data: { ...createNoteDto, key: Key },
          select: {
            id: true
          }
        })
      } catch (dbErr) {
        // don't leave an orphaned object in the bucket
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key })).catch(() => { })
        throw dbErr
      }

      return {
        success: true,
        data: note
      };
    }
    catch (err) {
      console.log("[arvan-uploading-error]: ", err)
      if (err instanceof HttpException) {
        throw err
      }
      throw new InternalServerErrorException("مشکلی در آپلود فایل به آروان پیش آمده است.")
    }
    finally {
      await unlink(file.path).catch(() => { });
    }
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    const note = await this.prisma.note.update({
      where: {
        id
      },
      data: updateNoteDto
    })

    return {
      success: true,
      data: note
    }
  }

  async remove(id: string) {
    const note = await this.prisma.note.findUnique({
      where: {
        id
      }
    })

    if (!note) {
      throw new NotFoundException("جزوه ی مورد نظر یافت نشده است.")
    }
    // a note without a file must still be deletable
    if (note.key) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: note.key,
          })
        );
      }
      catch (err) {
        console.log("[bucket-removing-error]: ", err)
        throw new InternalServerErrorException("در حذف فایل از صندوقچه مشکلی پیش آمده است.")
      }
    }

    await this.prisma.note.delete({
      where: {
        id
      }
    })

    return {
      success: true,
      data: {
        id
      }
    }
  }

  async findAll(page: number = 1, search: string, category: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        ...(search && {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive"
              }
            },
            {
              description: {
                contains: search,
                mode: "insensitive"
              }
            }
          ]
        })
        ,

        ...(category && {
          categoryId: category
        })
      },
      skip: (page - 1) * this.limit,
      take: this.limit + 1,
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" }
      ]
    })

    const nextPage = this.limit < notes.length
    if (nextPage) notes.pop()

    return {
      success: true,
      data: { notes, nextPage }
    }
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: {
        id
      },
      include: {
        category: true
      }
    })

    if (!note) {
      throw new NotFoundException("جزوه ی مورد نظر یافت نشده است.")
    }
    if (!note.key) {
      throw new BadRequestException("نام فایل درون صندوقچه پیدا نشده است.")
    }

    return {
      success: true,
      data: note
    }
  }

  async getSignedUrl(id: string) {
    const note = await this.prisma.note.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        key: true
      }
    })

    if (!note) {
      throw new NotFoundException("جزوه ی مورد نظر یافت نشده است.")
    }
    if (!note.key) {
      throw new BadRequestException("نام فایل درون صندوقچه پیدا نشده است.")
    }

    const clientParams = {
      Bucket: this.bucket,
      Key: note.key,
    };

    const signedRequest = new S3RequestPresigner(this.s3.config);

    try {
      const request = await createRequest(
        this.s3,
        new GetObjectCommand(clientParams)
      );
      const signedUrl = formatUrl(
        await signedRequest.presign(request, {
          expiresIn: 60 * 60 * 24,
        })
      );

      return {
        success: true,
        data: signedUrl
      }
    } catch (err) {
      console.log('Error creating presigned URL', err);
      throw new InternalServerErrorException("خطایی در ساخت لینک دانلود رخ داده است.")
    }
  }


  async uploadImg(
    file: Express.Multer.File,
    key: string,
  ) {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.ARVAN_BUCKET!,
          Key: key,
          Body: createReadStream(file.path),
          ContentType: file.mimetype,
        }),
      );
    } finally {
      await unlink(file.path).catch(() => { });
    }

    return key;
  }
  async deleteImg(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.ARVAN_BUCKET!,
        Key: key,
      }),
    );
  }
  async getSignedUrlImg(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.ARVAN_BUCKET!,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: 60 * 30,
    });
  }
}