import { AttemptStatus } from "@prisma/client";

export interface AttemptInterface {
    exam: {
        id: string;
        title: string;
    };
    expireAt: Date;
    id: string;
    userId: string;
    examId: string;
    startAt: Date;
    status: AttemptStatus;
}