import { PartialType } from '@nestjs/mapped-types';
import { CreateOfficialQuestionDto, CreateQuestionDto } from './create-question.dto.js';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

export class UpdateOfficialQuestionDto extends PartialType(CreateOfficialQuestionDto) {}
