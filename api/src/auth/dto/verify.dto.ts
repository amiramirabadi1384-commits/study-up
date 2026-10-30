import { IsPhoneNumber, IsString } from "class-validator";

export class VerifyDto {
    @IsPhoneNumber('IR', {
        message: 'شماره تلفن معتبر نیست.',
    })
    phone: string

    @IsString()
    code: string
}