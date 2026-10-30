import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateOptionDto{
    @IsString({message: "متن گزینه را به درستی وارد کنید."})
    @IsNotEmpty({message: "متن گزینه نباید خالی باشد."})
    @IsOptional()
    text?: string;

    @IsBoolean({message: "ورودی درست یا غلط بودن گزینه ها اشتباه می باشد."})
    @IsOptional()
    isTrue?: boolean;
}