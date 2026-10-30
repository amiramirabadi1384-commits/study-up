import { Role } from "@prisma/client";

export interface Payload{
    id: string,
    phone: string,
    role: Role
}