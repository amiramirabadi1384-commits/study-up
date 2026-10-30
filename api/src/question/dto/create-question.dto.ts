import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OptionsDto {
  @IsString({message: "متن گزینه را به درستی وارد کنید."})
  @IsNotEmpty({message: "متن گزینه نباید خالی باشد."})
  text: string;

  @IsBoolean({message: "ورودی درست یا غلط بودن گزینه ها اشتباه می باشد."})
  isTrue: boolean;
}

export class CreateQuestionDto {
  @IsString({message: "متن سوال را به درستی وارد کنید."})
  @IsNotEmpty({message: "متن سوال نباید خالی باشد."})
  text: string;

  @IsOptional()
  @IsString({message: "متن پاسخ را در فرمت درست وارد نمایید."})
  answer?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionsDto)
  options: OptionsDto[];

  @IsUUID(undefined, {message: "آیدی بانک سوال درست نمی باشد."})
  bankId: string
}

export class CreateOfficialQuestionDto{
  @IsString({message: "متن سوال را به درستی وارد کنید."})
  @IsNotEmpty({message: "متن سوال نباید خالی باشد."})
  text: string;

  @IsOptional()
  @IsString({message: "متن پاسخ را در فرمت درست وارد نمایید."})
  answer?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionsDto)
  options: OptionsDto[];

  @IsUUID(undefined, {message: "آیدی آزمون درست نمی باشد."})
  @IsOptional()
  examId: string
}