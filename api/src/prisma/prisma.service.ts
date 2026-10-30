import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit{
    constructor(private config: ConfigService){
        const adapter = new PrismaPg({
            connectionString: config.get<string>("DATABASE_URL")
        })
        super({adapter})
    }

    onModuleDestroy() {
        this.$disconnect()
        console.log("database disconnected")
    }

    onModuleInit() {
        this.$connect()
        console.log("database connected")
    }
}
