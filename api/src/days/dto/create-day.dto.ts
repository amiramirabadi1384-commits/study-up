import { IsOptional, IsString } from "class-validator"

export class CreateDayDto {
    @IsString({message: "عنوان روز را درست وارد کنید."})
    title:string

    @IsOptional()
    @IsString({message: "توضیحات محصول را درست وارد کنید."})
    description?: string
}
