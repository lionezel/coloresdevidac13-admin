import { Timestamp } from "firebase/firestore";

export interface CreditCustomer {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    createdAt?: Timestamp;
    totalDebt?: number;
}
