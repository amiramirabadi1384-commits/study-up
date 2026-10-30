import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBankDto } from './dto/create-bank.dto.js';
import { UpdateBankDto } from './dto/update-bank.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryType } from '@prisma/client';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) { }
  async public(id: string) {
    await this.prisma.bank.update({
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
    await this.prisma.bank.update({
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

  async create(createBankDto: CreateBankDto) {
    const cat = await this.prisma.category.findUnique({
      where: {
        id: createBankDto.categoryId,
      },
    });

    if (!cat) {
      throw new NotFoundException('دسته مورد نظر یافت نشده است.');
    }

    if (
      cat.type !== CategoryType.SUB_TOPIC &&
      cat.type !== CategoryType.TOPIC
    ) {
      throw new BadRequestException(
        `امکان ساخت بانک سوال برای دسته ی ${cat.type} وجود ندارد.`,
      );
    }

    const bank = await this.prisma.bank.create({
      data: createBankDto,
      select: {
        id: true,
      },
    });

    return {
      success: true,
      data: bank,
    };
  }

  async findAll(categoryId: string, children: boolean = true) {
    const cat = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!cat) {
      throw new NotFoundException('دسته مورد نظر یافت نشد.');
    }

    const categoryIds = children
      ? await this.getCategoryIds(categoryId)
      : [categoryId];

    const banks = await this.prisma.bank.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
        title: true,
        count: true,
      },
    });

    return {
      success: true,
      data: banks,
    };
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({
      where: {
        id,
      },
    });

    if (!bank) {
      throw new NotFoundException('بانک مورد نظر یافت نشد.');
    }

    return {
      success: true,
      data: bank,
    };
  }

  async update(id: string, updateBankDto: UpdateBankDto) {
    const existingBank = await this.prisma.bank.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingBank) {
      throw new NotFoundException('بانک مورد نظر یافت نشد.');
    }

    if (updateBankDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: updateBankDto.categoryId,
        },
      });

      if (!category) {
        throw new NotFoundException('دسته مورد نظر یافت نشد.');
      }

      if (
        category.type !== CategoryType.SUB_TOPIC &&
        category.type !== CategoryType.TOPIC
      ) {
        throw new BadRequestException(
          `امکان ساخت بانک سوال برای دسته ی ${category.type} وجود ندارد.`,
        );
      }
    }

    const bank = await this.prisma.bank.update({
      where: {
        id,
      },
      data: updateBankDto,
    });

    return {
      success: true,
      data: bank,
    };
  }

  async remove(id: string) {
    const existingBank = await this.prisma.bank.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingBank) {
      throw new NotFoundException('بانک مورد نظر یافت نشد.');
    }

    await this.prisma.bank.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      data: {
        id,
      },
    };
  }

  /**
   * Returns the category ID and all descendant category IDs.
   * Traverses CategoryRelation through the `childs` relation.
   */
  private async getCategoryIds(
    categoryId: string,
    visited: Set<string> = new Set(),
  ): Promise<string[]> {
    // Prevent infinite recursion if cyclic relations exist.
    if (visited.has(categoryId)) {
      return [];
    }

    visited.add(categoryId);

    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
        childs: {
          select: {
            childId: true,
          },
        },
      },
    });

    if (!category) {
      return [];
    }

    const descendantIds = await Promise.all(
      category.childs.map((relation) =>
        this.getCategoryIds(relation.childId, visited),
      ),
    );

    return [
      category.id,
      ...descendantIds.flat(),
    ];
  }
}