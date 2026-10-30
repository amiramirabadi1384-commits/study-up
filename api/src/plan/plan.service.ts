import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService){}

  private validatePrices(price: unknown, discountPrice: unknown) {
    const p = Number(price)

    if (!Number.isFinite(p) || p < 0) {
      throw new BadRequestException("قیمت نمی تواند مقدار منفی باشد.")
    }

    if (discountPrice !== undefined && discountPrice !== null) {
      const d = Number(discountPrice)

      if (!Number.isFinite(d) || d < 0) {
        throw new BadRequestException("قیمت پس از تخفیف نمی تواند منفی باشد.")
      }
      if (d >= p) {
        throw new BadRequestException("قیمت پس از تخفیف باید کمتر از قیمت اصلی باشد.")
      }
    }
  }

  async create(createPlanDto: CreatePlanDto) {
    this.validatePrices(createPlanDto.price, createPlanDto.discountPrice)

    const plan = await this.prisma.plan.create({
      data: createPlanDto
    })

    return {
      success: true,
      data: plan
    }
  }

  async findAll() {
    const plans = await this.prisma.plan.findMany()

    return {
      success: true,
      data: plans
    }
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: {
        id
      }
    })

    if (!plan) {
      throw new NotFoundException("پلن مورد نظر یافت نشد.")
    }

    return {
      success: true,
      data: plan
    }
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { id }
    })

    if (!existing) {
      throw new NotFoundException("پلن مورد نظر یافت نشد.")
    }

    this.validatePrices(
      updatePlanDto.price ?? existing.price,
      updatePlanDto.discountPrice ?? existing.discountPrice
    )

    const plan = await this.prisma.plan.update({
      where: {
        id
      },
      data: updatePlanDto
    })

    return {
      success: true,
      data: plan
    }
  }

  async remove(id: string) {
    await this.prisma.plan.delete({
      where: {id}
    })

    return {
      success: true,
      data: {id}
    }
  }
}
