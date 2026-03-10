export interface OrderAddition {
    id: string;
    name: string;
    price: number;
}

export interface OrderProduct {
    productId: string;
    productName: string;
    variantId: string;
    variantLabel: string;
    price: number;
    quantity: number;
    image: string;
    additions?: OrderAddition[];
    total?: number;
}

export type OrderStatus =
    | "pendiente"
    | "enProceso"
    | "enCamino"
    | "porCobrar"
    | "completada"
    | "cancelada";

export interface Order {
    id?: string;
    name: string;
    notes?: string;
    paymentMethod: string;
    orderType?: "llevar" | "comerAca";
    address?: string;
    state: OrderStatus;
    date: any; // Firebase Timestamp or string
    dateSuccess?: any; // Fecha de cobro final
    products: OrderProduct[];
    total: number;
}
