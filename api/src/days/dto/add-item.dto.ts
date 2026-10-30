import { ContentType } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

export class AddItemDto{
    @IsUUID(undefined, {message: "آیدی آیتم ورودی نامعتبر می باشد."})
    id: string

    @IsEnum(ContentType)
    type: ContentType
}