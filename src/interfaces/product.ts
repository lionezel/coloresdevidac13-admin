export interface Variant {
  id: string;
  label: string;
  price: number;
  stock: number;
  initialDailyStock?: number;
  lastStockResetDate?: string;
  image: string;
  inventoryItemId?: string;
}

export interface Product {
  id?: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
  inventoryItemId?: string;
  variants: Variant[];
}
