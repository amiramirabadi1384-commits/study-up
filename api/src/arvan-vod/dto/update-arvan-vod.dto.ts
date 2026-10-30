import { PartialType } from '@nestjs/mapped-types';
import { CreateArvanVodDto } from './create-arvan-vod.dto.js';

export class UpdateArvanVodDto extends PartialType(CreateArvanVodDto) {}
