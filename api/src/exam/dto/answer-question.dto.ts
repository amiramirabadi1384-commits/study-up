import { IsOptional, IsUUID } from "class-validator";

export class AnswerQuestionDto{
    @IsUUID()
    @IsOptional()
    optionId?: string
}