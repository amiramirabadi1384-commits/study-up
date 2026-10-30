import { CategoryType } from "@prisma/client"
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateCategoryDto {
    @IsString({message: "نام دسته را درست ئارد کنید."})
    title: string

    @IsUUID(undefined, {message: "ایدی ورودی صحیح نمی باشد."})
    @IsOptional()
    parentId?: string

    @IsEnum(CategoryType, {message: "نوع وارده برای دسته درست نمی باشد."})
    type: CategoryType
}
