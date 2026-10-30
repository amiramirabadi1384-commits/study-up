import { IsDecimal, IsOptional, IsString } from "class-validator"

export class CreatePkgDto {
    @IsString({message: "عنوان پکیج را درست وارد کنید."})
    title: string

    @IsString({message: "توضیحات را به درستی وارد کنید."})
    @IsOptional()
    description?: string

    @IsDecimal()
    price: number

    @IsDecimal()
    @IsOptional()
    discountPrice?: number
}
