import { Injectable, PipeTransform } from '@nestjs/common';

/** Page-size pipe: defaults to 10, clamps to [1, 50]. */
@Injectable()
export class LimitPipe implements PipeTransform {
  transform(value: any) {
    const limit = Number(value);

    if (!Number.isInteger(limit) || limit < 1) {
      return 10;
    }

    return Math.min(limit, 50);
  }
}
