import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC } from "../decorators/public.decorator.js";

@Injectable()
export class ATGaurd extends AuthGuard('jwt'){
    constructor(private reflector: Reflector){
        super()
    }

    canActivate(context: ExecutionContext){
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
            context.getHandler(),
            context.getClass()
        ])

        if(isPublic){
            return true
        }

        return super.canActivate(context)
    }
}