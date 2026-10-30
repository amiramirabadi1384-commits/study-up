import { PartialType } from '@nestjs/mapped-types';
import { CreatePkgDto } from './create-pkg.dto.js';

export class UpdatePkgDto extends PartialType(CreatePkgDto) {}
