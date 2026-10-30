import { IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator"

export class CreateBankDto {
    @IsString({message: "عنوان بانک را درست وارد کنید."})
    title: string

    @IsString({message: "توضیحات را در فرمت درست وارد کنید."})
    @IsOptional()
    description?: string

    @IsNumber(undefined, {message: "زمان هر سال در بانک را درست وارد کنید."})
    @Min(20, {message: "حداقل زمان هر سوال 20 ثانیه است."})
    duration: number

    @IsUUID(undefined, {message: "فرمت ایدی دسته یندی اشتباه است."})
    categoryId: string
}
