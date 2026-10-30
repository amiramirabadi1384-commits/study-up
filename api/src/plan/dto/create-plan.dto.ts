import { PlanType } from "@prisma/client"
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator"

export class CreatePlanDto {
    @IsString({message: "عنوان پلن را درست وارد کنید."})
    title: string

    @IsString({message: "توضیحات را درست وارد کنید."})
    description: string

    @IsEnum(PlanType, {message: "نوع پلن معتبر نمی باشد."})
    type: PlanType

    @IsNumber(undefined, {message: "قیمت را درست وارد کنید."})
    @Min(0, {message: "قیمت نمی تواند منفی باشد."})
    price: number

    @IsNumber(undefined, {message: "قیمت پس از تخفیف را درست وارد کنید."})
    @Min(0, {message: "قیمت پس از تخفیف نمی تواند منفی باشد."})
    @IsOptional()
    discountPrice?: number

    @IsInt({message: "مدت پلن را درست وارد کنید."})
    @Min(1, {message: "مدت پلن باید حداقل یک روز باشد."})
    durationDays: number
}
