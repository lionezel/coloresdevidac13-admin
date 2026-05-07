export interface StockMovement {
    type: "in" | "out" | "sale" | "count";
    quantity: number;
    date: any; // Timestamp
    user: string;
    description: string;
}

export interface InventoryItem {
    id?: string;
    name: string;
    currentStock: number;
    unit: string; // e.g., "Unidades", "Gramos", "Porciones"
    movements?: StockMovement[];
}
