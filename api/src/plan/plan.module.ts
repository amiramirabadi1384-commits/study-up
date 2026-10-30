import { Module } from '@nestjs/common';
import { PlanService } from './plan.service.js';
import { AdminPlanController } from './contorllers/admin-plan.controller.js';

@Module({
  controllers: [AdminPlanController],
  providers: [PlanService],
})
export class PlanModule {}
