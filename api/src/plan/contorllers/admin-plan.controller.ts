import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlanService } from '../plan.service.js';
import { CreatePlanDto } from '../dto/create-plan.dto.js';
import { UpdatePlanDto } from '../dto/update-plan.dto.js';
import { RoleDec } from '../../common/decorators/role.decorator.js';
import { Role } from '@prisma/client';

@Controller('admin/plans')
@RoleDec(Role.ADMIN)
export class AdminPlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }
}
