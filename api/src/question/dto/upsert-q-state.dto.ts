import { IsOptional, IsUUID } from "class-validator";

export class UpsertUserQuestionStateDto{
    @IsUUID(undefined, {message: "ایدی گزینه انتخابی درست نمی باشد."})
    @IsOptional()
    optionId?: string
}