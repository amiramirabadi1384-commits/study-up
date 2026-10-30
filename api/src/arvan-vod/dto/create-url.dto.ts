import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUrlDto{
    @IsString()
    @IsOptional()
    filename: string;

    @IsString()
    fileType: string;

    @IsNumber()
    fileSize: number;
}