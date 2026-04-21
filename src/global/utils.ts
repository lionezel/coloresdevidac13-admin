import { OrderProduct } from "../interfaces/Order";

/**
 * Removes all properties with value `undefined` from an object recursively.
 * This is necessary because Firestore does not support `undefined` values.
 */
export function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Preserve Dates and Firestore Timestamps
  if (obj instanceof Date || (typeof obj.toDate === "function")) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  return Object.keys(obj).reduce((acc: any, key) => {
    const value = obj[key];
    if (value !== undefined) {
      acc[key] = removeUndefined(value);
    }
    return acc;
  }, {});
}

/**
 * Groups a list of products by productId, variantId and additions.
 * Used for merging items in the cashier view and receipts.
 */
export function groupProducts(products: OrderProduct[]): OrderProduct[] {
  const grouped: OrderProduct[] = [];

  (products || []).forEach((p) => {
    const existing = grouped.find((g) => {
      if (g.productId !== p.productId || g.variantId !== p.variantId) return false;
      const gAddIds = (g.additions || []).map((a) => a.id).sort().join(",");
      const pAddIds = (p.additions || []).map((a) => a.id).sort().join(",");
      return gAddIds === pAddIds;
    });

    if (existing) {
      existing.quantity += p.quantity;
      existing.total = (existing.total || 0) + (p.total ?? (p.price * p.quantity));
    } else {
      grouped.push({ ...p });
    }
  });

  return grouped;
}
