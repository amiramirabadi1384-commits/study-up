import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PaginationPipePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const page = Number(value)

    if(!Number.isInteger(page) || page < 1){
      return 1
    }

    return page;
  }
}