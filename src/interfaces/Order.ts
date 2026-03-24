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
    completed?: boolean;
}

export type OrderStatus =
    | "pendiente"
    | "enProceso"
    | "enCamino"
    | "porCobrar"
    | "listo / caja"
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
    subTotal?: number;
    tipPercentage?: number;
    tipAmount?: number;
    customerId?: string;
    customerName?: string;
    shippingCost?: number;
    discountAmount?: number;
    discountType?: "total" | "producto";
    discountMode?: "percentage" | "fixed";
    discountValue?: number;
    discountProductId?: string;
}
