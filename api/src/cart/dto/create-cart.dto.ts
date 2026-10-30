import { CartItemType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsUUID, ValidateIf, ValidateNested } from "class-validator";

export class CartItem {
    @IsEnum(CartItemType)
    type: CartItemType;

    @ValidateIf(o => o.type === CartItemType.PLAN)
    @IsUUID(undefined, {
        message: "ایدی پلن صحیح نمی باشد.",
    })
    planId?: string;

    @ValidateIf(
        o => o.type === CartItemType.PLAN &&
            o.planId !== undefined
    )
    @IsOptional()
    @IsUUID(undefined, {
        message: "ایدی درس ورودی اشتباه می باشد.",
    })
    courseId?: string;

    @ValidateIf(o => o.type === CartItemType.PKG)
    @IsUUID(undefined, {
        message: "ایدی پکیج صحیح نمی باشد.",
    })
    pkgId?: string;
}
export class CreateCartDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItem)
    items: CartItem[]
}
