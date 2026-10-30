import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ContentType } from '@prisma/client';

@Injectable()
export class ContentTypePipe implements PipeTransform {
  transform(value: string): ContentType {
    if (!Object.values(ContentType).includes(value as ContentType)) {
      throw new BadRequestException(
        `نوع آیتم باید یکی از این موارد باشد: ${Object.values(ContentType).join(', ')}`,
      );
    }

    return value as ContentType;
  }
}