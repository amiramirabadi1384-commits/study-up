import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator"

export class CreateExamDto {
    @IsString({message: "عنوان آزمون را درست وارد کنید."})
    title: string

    @IsString({message: "توضیحات محصول را درست وارد کنید."})
    @IsOptional()
    description?: string

    // seconds
    @IsInt({message: "زمان آزمون را به درستی وارد کنید."})
    @Min(1, {message: "زمان آزمون باید بیشتر از صفر باشد."})
    duration: number

    @IsDateString(undefined, {message: "زمان شروع آزمون را درست وارد کنید."})
    @IsOptional()
    startAt?: string

    @IsDateString(undefined, {message: "زمان پایان آزمون را درست وارد کنید."})
    @IsOptional()
    endAt?: string

    @IsUUID(undefined, {message: "دسته ی آزمون را وارد کنید."})
    categoryId: string

    @IsUUID(undefined, {message: "ایدی درس به درستی وارد نشده است."})
    courseId: string
}
