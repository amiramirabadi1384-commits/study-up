export interface QuestionInterface {
    options: {
        id: string;
        text: string;
    }[];
    id: string;
    examId: string;
    text: string;
    answer: string | null;
    createdAt: Date;
}