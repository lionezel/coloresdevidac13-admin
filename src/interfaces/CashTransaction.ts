import { Timestamp } from "firebase/firestore";

export interface CashTransaction {
    id?: string;
    restaurantId: string;
    dateStr: string; // YYYY-MM-DD for fast grouping alongside the CashClosing target date
    type: "income" | "expense";
    description: string;
    amount: number;
    createdBy: {
        uid: string;
        name: string;
        role: string;
    };
    createdAt: Timestamp;
}
