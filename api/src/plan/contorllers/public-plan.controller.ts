import { Controller, Get, Param } from '@nestjs/common';
import { PlanService } from '../plan.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('plans')
@Public()
export class AdminPlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }
}
