import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePkgDto } from './dto/create-pkg.dto.js';
import { UpdatePkgDto } from './dto/update-pkg.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PkgService {
  constructor(private prisma: PrismaService) { }
  private limit = 10

  async publish(pkgId:string){
    const pkg = await this.prisma.pkg.update({
      where: {
        id: pkgId
      },
      data: {
        publish: true
      },
      select: {
        id: true
      }
    })

    return {
      success: true,
      data: pkg
    }
  }

  async unPublish(pkgId:string){
    const pkg = await this.prisma.pkg.update({
      where: {
        id: pkgId
      },
      data: {
        publish: false
      },
      select: {
        id: true
      }
    })

    return {
      success: true,
      data: pkg
    }
  }

  // Prices arrive as decimal strings (or Prisma Decimals), so always compare as numbers.
  private validatePrices(price: unknown, discountPrice: unknown) {
    const p = Number(price)

    if (!Number.isFinite(p) || p < 0) {
      throw new BadRequestException("قیمت نمی تواند مقدار منفی باشد.")
    }

    if (discountPrice !== undefined && discountPrice !== null && discountPrice !== '') {
      const d = Number(discountPrice)

      if (!Number.isFinite(d) || d < 0) {
        throw new BadRequestException("قیمت پس از تخفیف نمی تواند منفی باشد.")
      }
      if (d >= p) {
        throw new BadRequestException("قیمت پس از تخفیف باید کمتر از قیمت اصلی باشد.")
      }
    }
  }

  async create(createPkgDto: CreatePkgDto) {
    this.validatePrices(createPkgDto.price, createPkgDto.discountPrice)

    const pkg = await this.prisma.pkg.create({
      data: createPkgDto
      ,
      select: {
        id: true
      }
    })

    return {
      success: true,
      data: pkg
    }
  }

  async findAll(search: string | undefined, page: number = 1, showAll: boolean = true, userId: string|undefined = '') {
    const pkgs = await this.prisma.pkg.findMany({
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ]
        }),
        ...(!showAll && {
          publish: true
        }),
        ...(userId && {
          users: {
            some: {
              userId
            }
          }
        })
      },
      take: this.limit + 1,
      skip: (page - 1) * this.limit,
      orderBy: [
        { id: "desc" }
      ]
    })

    const nextPage = this.limit < pkgs.length
    if(nextPage) pkgs.pop()

    return {
      success: true,
      data: {pkgs, nextPage}
    }
  }

  async findOne(id: string, showAll: boolean = true) {
    const pkg = await this.prisma.pkg.findUnique({
      where: {
        id,
        ...(!showAll && {
          publish: true
        })
      }
    })

    if (!pkg) {
      throw new NotFoundException("پکیج مورد نظر یافت نشده است.")
    }

    return {
      success: true,
      data: pkg
    }
  }

  async update(id: string, updatePkgDto: UpdatePkgDto) {
    let pkg = await this.prisma.pkg.findUnique({
      where: {id}
    })

    if (!pkg) {
      throw new NotFoundException("پکیج مورد نظر یافت نشده است.")
    }

    this.validatePrices(
      updatePkgDto.price ?? pkg.price,
      updatePkgDto.discountPrice ?? pkg.discountPrice
    )

    pkg = await this.prisma.pkg.update({
      where: {
        id
      },
      data: updatePkgDto
    })

    return {
      success: true,
      data: pkg
    }
  }

  async remove(id: string) {
    await this.prisma.pkg.delete({
      where: {id}
    })

    return {
      success: true,
      data: {id}
    }
  }

  async findOneDetailes(userId:string, pkgId:string){
    const pkg = await this.prisma.pkg.findUnique({
      where: {
        id: pkgId
      },
      include: {
        days: {
          select: {
            id: true,
            title: true,
            description: true,
            order: true
          }
        }
      }
    })

    return {
      success: true,
      data: pkg
    }
  }
}
