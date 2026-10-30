import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class SearchQueryPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (!value) {
      return
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('Search query must be a string');
    }

    if (/[^a-zA-Z0-9\s\u0600-\u06FF\u200c\u200d\-_.()؟?]/.test(value)) {
      throw new BadRequestException(
        'Search query contains invalid characters',
      );
    }

    return value;
  }
}