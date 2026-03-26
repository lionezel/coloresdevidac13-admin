import { Timestamp } from "firebase/firestore";

export interface CashClosing {
    id?: string;
    restaurantId: string;
    date: string; // YYYY-MM-DD for easy grouping (or Timestamp)
    closedBy: {
        uid: string;
        name: string;
    };
    openingBalance: number;
    actualCash: number;
    difference: number;
    actualTransfer?: number;
    transferDifference?: number;
    actualCard?: number;
    cardDifference?: number;
    totals: {
        efectivo: number;
        tarjeta: number;
        transferencia: number;
        otros: number;
    };
    totalSales: number;
    totalGuiaDiscount?: number;
    denominations?: {
        coins100?: number;
        coins200?: number;
        coins500?: number;
        coins1000?: number;
        bills2000?: number;
        bills5000?: number;
        bills10000?: number;
        bills20000?: number;
        bills50000?: number;
        bills100000?: number;
    };
    expenses?: {
        description: string;
        amount: number;
    }[];
    totalExpenses?: number;
    notes?: string;
    createdAt: Timestamp;
}
