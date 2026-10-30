import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_DEC } from "../decorators/role.decorator.js";
import { Role } from "@prisma/client";

@Injectable()
export class RoleGaurd implements CanActivate{
    constructor(private reflector: Reflector){}

    canActivate(context: ExecutionContext){
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_DEC, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if(requiredRoles.includes(Role.ADMIN) && user.role === Role.SUPER_ADMIN){
            return true
        }
        if(user.role && requiredRoles.includes(user.role)){
            return true
        }

        return false
    }
}