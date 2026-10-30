import { IsNumber, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateNoteDto {
    @IsString({message: "عنوان محصول را درست وارد کنید."})
    title: string

    @IsString({message: "توضیحات را درست وارد کنید."})
    @IsOptional()
    description?: string

    @IsNumber(undefined, {message: "قیمت محصول را درست وارد کنید."})
    price: number

    @IsNumber(undefined, {message: "تخفیف محصول را درست وارد کنید."})
    @IsOptional()
    discountPrice?: string

    @IsUUID(undefined, {message: "فرمت آیدی ورودی را درست وارد کنید."})
    categoryId: string
}
