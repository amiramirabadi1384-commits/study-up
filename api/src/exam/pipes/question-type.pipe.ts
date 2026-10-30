import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { QuestionType } from '../types/question-type.type.js';

@Injectable()
export class QuestionTypePipe implements PipeTransform {
    transform(value: string, metadata: ArgumentMetadata): QuestionType {
        const normalized = value?.toUpperCase();

        if (!Object.values(QuestionType).includes(normalized as QuestionType)) {
            throw new BadRequestException(
                `Invalid question type. Allowed values: ${Object.values(QuestionType).join(', ')}`,
            );
        }

        return normalized as QuestionType;
    }
}