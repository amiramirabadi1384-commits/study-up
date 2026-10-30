import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsUUID, Min, ValidateNested } from "class-validator"
import { Type } from 'class-transformer';

class banks {
    @IsUUID(undefined, { message: "ایدی بانک سوالات معتبر نمی باشد." })
    bankId: string

    @IsInt()
    @Min(1, { message: "حداقل تعداد سوالات باید 1 عدد باشد." })
    count: number
}

// String enums: the values are compared against text columns in raw SQL.
export enum SourceFilter {
    ALL = 'ALL',
    WRONG = 'WRONG',
    UNANSWERED = 'UNANSWERED',
    NOT_SEEN = 'NOT_SEEN'
}
export enum DifficultyFilter {
    HARD = 'HARD',
    MEDIUM = 'MEDIUM',
    EASY = 'EASY',
    MIXED = 'MIXED'
}

export class UserCreateExamDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => banks)
    banks: banks[]

    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(SourceFilter, { each: true })
    filter: SourceFilter[];

    @IsArray()
    @IsEnum(DifficultyFilter, { each: true })
    difficulty: DifficultyFilter[]

    @IsBoolean()
    fromMarked: boolean
}