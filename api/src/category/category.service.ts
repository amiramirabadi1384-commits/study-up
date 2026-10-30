import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryType } from '@prisma/client';
import { categoryMap } from './types/category.type.js';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  async create(createCategoryDto: CreateCategoryDto) {
    if (createCategoryDto.parentId) {
      // MAJOR is the root level, so only non-MAJOR categories can have a parent.
      if (createCategoryDto.type === CategoryType.MAJOR)
        throw new BadRequestException("نوع دسته ی وارده اشتباه می باشد.")

      const parent = await this.prisma.category.findUnique({
        where: {
          id: createCategoryDto.parentId
        }
      })

      if (!parent) {
        throw new NotFoundException("سر دسته مورد نظر یافت نشده است.")
      }

      if (!categoryMap.get(parent.type) || !categoryMap.get(createCategoryDto.type)) {
        throw new BadRequestException("تایپ های ورودی اشتباه می باشند.")
      }

      if (categoryMap.get(parent.type)! >= categoryMap.get(createCategoryDto.type)!) {
        throw new BadRequestException("نوع دسته نمی تواند بالاتر از سردسته قرار بگیرد.")
      }
    }

    // Category + relation are created atomically.
    const cat = await this.prisma.category.create({
      data: {
        title: createCategoryDto.title,
        type: createCategoryDto.type,
        ...(createCategoryDto.parentId && {
          childs: {
            create: {
              parent: {
                connect: {
                  id: createCategoryDto.parentId,
                },
              },
            },
          },
        }),
      },
    });

    return {
      success: true,
      data: cat
    }
  }

  async findAll(parentId: string | undefined, search: string | undefined, page: number = 1, limit: number = 10) {
    const cats = await this.prisma.category.findMany({
      where: {
        ...(parentId && {
          parents: {
            some: {
              parentId
            }
          }
        }),
        ...(search && {
          title: { contains: search, mode: "insensitive" }
        }),
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1
    })

    const nextPage = limit < cats.length
    if (nextPage) cats.pop()

    return {
      success: true,
      data: {
        cats,
        nextPage
      }
    }
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: {
        id
      }
    })

    if (!cat) {
      throw new NotFoundException("دسته مورد نظر یافت نشد.")
    }

    return {
      success: true,
      data: cat
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const cat = await this.prisma.category.update({
      where: {
        id
      },
      data: updateCategoryDto
    })

    return {
      success: true,
      data: cat
    }
  }

  async remove(id: string) {
    await this.prisma.category.delete({
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

  async addParent(catId: string, parentId: string) {
    if (catId === parentId) {
      throw new BadRequestException("یک دسته نمی تواند والد خودش باشد.")
    }

    const [cat, parent] = await Promise.all([
      this.prisma.category.findUnique({ where: { id: catId } }),
      this.prisma.category.findUnique({ where: { id: parentId } }),
    ])

    if (!cat || !parent) {
      throw new NotFoundException("دسته مورد نظر یافت نشد.")
    }

    const parentRank = categoryMap.get(parent.type)
    const childRank = categoryMap.get(cat.type)

    // Strictly increasing ranks also make cycles impossible.
    if (!parentRank || !childRank || parentRank >= childRank) {
      throw new BadRequestException("نوع دسته نمی تواند بالاتر از سردسته قرار بگیرد.")
    }

    const rel = await this.prisma.categoryRelation.create({
      data: {
        parentId,
        childId: catId
      }
    })

    return {
      success: true,
      data: rel
    }
  }

  async removeParent(catId: string, parentId: string) {
    const rel = await this.prisma.categoryRelation.delete({
      where: {
        parentId_childId: {
          parentId,
          childId: catId
        }
      }
    })

    return {
      success: true,
      data: rel
    }
  }
}
