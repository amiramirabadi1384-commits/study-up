import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDayDto } from './dto/create-day.dto.js';
import { UpdateDayDto } from './dto/update-day.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { AddItemDto } from './dto/add-item.dto.js';
import { ContentType } from '@prisma/client';
import { UpdateItemsOrderDto } from './dto/update-items-ordre.dto.js';

@Injectable()
export class DaysService {
  constructor(private prisma: PrismaService) { }
  private limit = 10

  async create(createDayDto: CreateDayDto, pkgId: string) {
    const lastDay = await this.prisma.day.findFirst({
      where: { pkgId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const day = await this.prisma.day.create({
      data: {
        ...createDayDto, pkgId,
        order: lastDay ? lastDay.order + 1 : 1
      },
      select: {
        id: true
      }
    })

    return {
      success: true,
      data: day
    }
  }

  async findAll(search: string | undefined, page: number = 1, pkgId: string, setLimit: boolean = true, showAll: boolean = true) {
    if (!showAll) {
      const pkg = await this.prisma.pkg.findUnique({
        where: { id: pkgId },
        select: { publish: true }
      })

      if (!pkg) {
        throw new NotFoundException("پکیج مورد نظر یافت نشده است.")
      }
      if (!pkg.publish) {
        throw new ForbiddenException("این پکیج فعلا از دسترسی خارج است.")
      }
    }

    const days = await this.prisma.day.findMany({
      where: {
        pkgId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ]
        })
      },
      orderBy: [
        { order: "asc" }
      ],
      ...(setLimit && {
        take: this.limit + 1,
        skip: (page - 1) * this.limit,
      }),
      include: {
        pkg: {
          select: {
            publish: true
          }
        }
      }
    })

    let nextPage = false;

    if (setLimit) {
      nextPage = this.limit < days.length
      if (nextPage) days.pop()
    }

    return {
      success: true,
      data: { days, nextPage }
    }
  }

  async findOne(id: string, showAll:boolean = true) {
    const day = await this.prisma.day.findUnique({
      where: {
        id,
      },
      include: {
        pkg: {
          select: {
            publish: true
          }
        }
      }
    })

    if (!day) {
      throw new NotFoundException("روز مورد نظر یافت نشده است.")
    }
    if(!showAll&&!day.pkg.publish){
      throw new ForbiddenException("این بسته موقتا از دسترس خارج می باشد.")
    }

    return {
      success: true,
      data: day
    }
  }

  async update(id: string, updateDayDto: UpdateDayDto) {
    const day = await this.prisma.day.update({
      where: { id },
      data: updateDayDto
    })

    return {
      success: true,
      data: day
    }
  }

  async updateOrder(pkgId: string, updateOrder: UpdateOrderDto) {
    const dayIds = updateOrder.days;

    if (new Set(dayIds).size !== dayIds.length) {
      throw new BadRequestException(
        'ایدی روز ها نباید دوبار وارد شود.',
      );
    }

    const days = await this.prisma.$transaction(async (tx) => {
      const existingDays = await tx.day.findMany({
        where: { pkgId },
        select: { id: true, order: true },
      });

      const existingIds = new Set(
        existingDays.map((day) => day.id),
      );

      if (
        dayIds.some((id) => !existingIds.has(id)) ||
        dayIds.length !== existingDays.length
      ) {
        throw new BadRequestException(
          'ایدی تمامی روز های مربوط به پکیج را وارد کنید.',
        );
      }

      // Calculate temporary positions above the current maximum.
      const maxOrder = Math.max(
        0,
        ...existingDays.map((day) => day.order),
      );

      const offset = maxOrder + dayIds.length + 1;

      // First, move all days to temporary positions.
      for (const [index, id] of dayIds.entries()) {
        await tx.day.update({
          where: { id },
          data: { order: offset + index },
        });
      }

      // Then assign their final positions.
      for (const [index, id] of dayIds.entries()) {
        await tx.day.update({
          where: { id },
          data: { order: index + 1 },
        });
      }

      return tx.day.findMany({
        where: { pkgId },
        orderBy: { order: 'asc' },
      });
    });

    return {
      success: true,
      data: days,
    };
  }

  async updateItemsOrder(dayId: string, { type, itemIds }: UpdateItemsOrderDto) {
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException(
        'آیدی آیتم ها نباید دوبار وارد شود.',
      );
    }

    const items = await this.prisma.$transaction(async (tx) => {
      const existingItems = await tx.dayItem.findMany({
        where: { dayId, type },
        select: { id: true },
      });

      const existingIds = new Set(
        existingItems.map((item) => item.id),
      );

      if (
        itemIds.length !== existingItems.length ||
        itemIds.some((id) => !existingIds.has(id))
      ) {
        throw new BadRequestException(
          'آیدی تمامی آیتم‌های این نوع مربوط به این روز را وارد کنید.',
        );
      }

      // Move items to temporary positions first to avoid collisions.
      const maxOrder = await tx.dayItem.aggregate({
        where: { dayId },
        _max: { order: true },
      });

      const offset =
        (maxOrder._max.order ?? 0) + itemIds.length + 1;

      for (const [index, id] of itemIds.entries()) {
        await tx.dayItem.update({
          where: { id },
          data: { order: offset + index },
        });
      }

      // Assign the requested order.
      for (const [index, id] of itemIds.entries()) {
        await tx.dayItem.update({
          where: { id },
          data: { order: index + 1 },
        });
      }

      return tx.dayItem.findMany({
        where: { dayId, type },
        orderBy: { order: 'asc' },
      });
    });

    return {
      success: true,
      data: items,
    };
  }

  async remove(id: string) {
    await this.prisma.day.delete({
      where: { id }
    })

    return {
      success: true,
      data: { id }
    }
  }

  async removeItem(id: string) {
    await this.prisma.dayItem.delete({
      where: { id }
    })

    return {
      success: true,
      data: { id }
    }
  }


  async addItem(dayId: string, { type, id }: AddItemDto) {
    const day = await this.prisma.day.findUnique({
      where: { id: dayId },
      select: { id: true }
    })

    if (!day) {
      throw new NotFoundException("روز مورد نظر یافت نشده است.")
    }

    const lastItem = await this.prisma.dayItem.findFirst({
      where: {
        dayId
      },
      orderBy: { order: 'desc' },
    })

    const item = await this.prisma.dayItem.create({
      data: {
        type: type,
        ...(type === ContentType.NOTE && {
          noteId: id
        }),
        ...(type === ContentType.VIDEO && {
          videoId: id
        }),
        ...(type === ContentType.QUESTION && {
          questionId: id
        }),
        order: lastItem ? lastItem.order + 1 : 1,
        dayId
      }
    })

    return {
      success: true,
      data: item
    }
  }

  async findAllItems(page:number=1, dayId:string, type:ContentType, showAll: boolean = true){
    const day = await this.prisma.day.findUnique({
      where: { id: dayId },
      select: { pkg: { select: { publish: true } } }
    })

    if (!day) {
      throw new NotFoundException("روز مورد نظر یافت نشده است.")
    }
    if (!showAll && !day.pkg.publish) {
      throw new ForbiddenException("این بسته موقتا از دسترس خارج می باشد.")
    }

    const items = await this.prisma.dayItem.findMany({
      where: {
        dayId,
        type,
      },
      take: this.limit+1,
      skip: this.limit*(page-1),
      orderBy: {order: "asc"},
      include: {
        day: {
          select: {
            pkg: {
              select: {
                publish: true
              }
            }
          }
        },
        video: {
          select: {
            title: true,
            description: true,
            thumbnailUrl: true,
            id: true,
            category: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        note: {
          select: {
            title: true,
            description: true,
            id: true,
            category: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        question: {
          select: {
            id: true,
            text: true,
            bank: {
              select: {
                category: {
                  select: {
                    title: true,
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const nextPage = this.limit < items.length
    if(nextPage) items.pop()
    
    return {
      success: true,
      data: {
        items,
        nextPage
      }
    }
  }
}
