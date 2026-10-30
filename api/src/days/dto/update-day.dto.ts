import { PartialType } from '@nestjs/mapped-types';
import { CreateDayDto } from './create-day.dto.js';

export class UpdateDayDto extends PartialType(CreateDayDto) {}
