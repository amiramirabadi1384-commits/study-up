import { ContentType } from "@prisma/client";
import { ArrayUnique, IsArray, IsEnum, IsUUID } from "class-validator";

export class UpdateItemsOrderDto{
    @IsArray()
    @IsUUID(undefined, {each: true})
    @ArrayUnique()
    itemIds: string[]

    @IsEnum(ContentType)
    type: ContentType
}