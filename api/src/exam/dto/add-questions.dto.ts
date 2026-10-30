import { IsArray, IsNotEmpty, IsUUID } from "class-validator";

export class AddQuestionsDto{
    @IsArray({message: "لیستی از آیدی سوالات باید فرستاده شود."})
    @IsNotEmpty({message: "لیست سوالات نباید خالی بماند."})
    @IsUUID(undefined, {each: true, message: "ایدی سوال یا سوالات صحبح نمی باشد."})
    questions: string[]
}