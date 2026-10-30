import { ArrayUnique, IsArray, IsUUID } from "class-validator";

export class UpdateOrderDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  days: string[];
}