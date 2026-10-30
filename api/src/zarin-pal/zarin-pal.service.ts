import { Injectable } from '@nestjs/common';
import ZarinPal from 'zarinpal-node-sdk'

@Injectable()
export class ZarinPalService {
    private zarinpal: any
    constructor(){
        //@ts-ignore
        this.zarinpal = new ZarinPal({
            merchantId: process.env.ZARINPAL_MERCHANT_ID,
            sandbox: process.env.NODE_ENV !== "production"
        })
    }

    async createPayment(amount: number, description: string){
        const res = await this.zarinpal.payments.create({
            amount,
            description,
            callback_url: process.env.CALL_BACK_URL
        })

        const authority = res.data.authority;

        const paymentUrl = this.zarinpal.payments.getRedirectUrl(authority);

        return {
            authority,
            paymentUrl
        }
    }

    async verifyPayment(authority: string, amount: number){
        return this.zarinpal.verifications.verify({
            authority,
            amount
        })
    }
}
