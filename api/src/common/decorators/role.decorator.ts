import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const ROLE_DEC = "role";
export const RoleDec = (...roles: Role[]) => SetMetadata(ROLE_DEC, roles)