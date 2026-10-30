import { IsPhoneNumber } from "class-validator";

export class LoginDto {
    @IsPhoneNumber('IR', {
        message: 'شماره تلفن معتبر نیست.',
    })
    phone: string
}