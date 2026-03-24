import { useMemo } from "react";
import { Order } from "../interfaces/Order";

export type Period = "day" | "week" | "month" | "year" | "custom";

/* =========================
   DATE HELPERS
========================= */
/* =========================
   DATE HELPERS
========================= */
const toDate = (order: any): Date => {
  if (!order) return new Date();

  // Lista extensiva de campos posibles. Priorizamos dateSuccess si existe, luego date.
  const dateValue =
    order.dateSuccess ||
    order.date ||
    order.createdAt ||
    order.timestamp ||
    order.fecha ||
    order.time;

  if (!dateValue) return new Date();

  // Intento de conversión a Date
  let dateObj: Date;
  if (typeof dateValue.toDate === "function") {
    dateObj = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    dateObj = dateValue;
  } else if (typeof dateValue === "number") {
    dateObj = new Date(dateValue);
  } else if (dateValue && typeof dateValue === "object" && (dateValue.seconds !== undefined || dateValue._seconds !== undefined)) {
    const s = dateValue.seconds !== undefined ? dateValue.seconds : dateValue._seconds;
    dateObj = new Date(s * 1000);
  } else {
    dateObj = new Date(dateValue);
  }

  return isNaN(dateObj.getTime()) ? new Date() : dateObj;
};

const getStartOfPeriod = (period: Period, customDate?: Date): Date => {
  const start = customDate ? new Date(customDate.getTime()) : new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
    case "custom":
      break;
    case "week": {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      break;
    }
    case "month":
      start.setDate(1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
  }
  return start;
};

const getEndOfPeriod = (period: Period, customDate?: Date): Date => {
  const end = customDate ? new Date(customDate.getTime()) : new Date();
  
  switch (period) {
    case "day":
    case "custom":
      end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const day = end.getDay();
      const diff = end.getDate() - day + (day === 0 ? 0 : 7);
      end.setDate(diff);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return end;
};

const getPreviousPeriodRange = (period: Period, customDate?: Date): { start: Date; end: Date } => {
  const startCurrent = getStartOfPeriod(period, customDate);
  const end = new Date(startCurrent);
  end.setMilliseconds(-1);

  const start = new Date(startCurrent);
  switch (period) {
    case "day":
    case "custom":
      start.setDate(start.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { start, end };
};

/* =========================
   ANALYTICS HOOK
========================= */
export const useAnalytics = (orders: Order[], period: Period, customDate?: Date) => {
  return useMemo(() => {
    const startOfPeriod = getStartOfPeriod(period, customDate);
    const endOfPeriod = getEndOfPeriod(period, customDate);
    const { start: startPrev, end: endPrev } = getPreviousPeriodRange(period, customDate);

    /* 🔹 Filtrar por períodos */
    const filteredOrders = orders.filter((order) => {
      const date = toDate(order);
      return date >= startOfPeriod && date <= endOfPeriod;
    });

    const previousOrders = orders.filter((order) => {
      const date = toDate(order);
      return date >= startPrev && date <= endPrev;
    });

    /* 🔹 KPIs actuales */
    const revenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const ordersCount = filteredOrders.length;
    const users = new Set(filteredOrders.map((o) => o.name)).size;
    const ticketAvg = ordersCount ? revenue / ordersCount : 0;

    /* 🔹 Growth */
    const prevRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const growth = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue && prevRevenue === 0) ? 100 : 0;

    /* 🔹 Estados */
    const delivered = filteredOrders.filter((o) => o.state === "completada").length;
    const cancelled = filteredOrders.filter((o) => o.state === "cancelada").length;

    /* 🔹 Revenue chart */
    const revenueMap: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      const date = toDate(order);
      const dateString = date.toLocaleDateString();
      const total = Number(order.total || 0);
      revenueMap[dateString] = (revenueMap[dateString] || 0) + total;
    });

    const revenueChart = Object.entries(revenueMap)
      .map(([date, total]) => {
        const firstOrderOfDay = filteredOrders.find(o => toDate(o).toLocaleDateString() === date);
        const timestamp = firstOrderOfDay ? toDate(firstOrderOfDay).getTime() : 0;
        return { date, total, timestamp };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    /* 🔹 Top productos */
    const productQtyMap: Record<string, number> = {};
    const productRevMap: Record<string, number> = {};

    filteredOrders.forEach((order) => {
      order.products?.forEach((p) => {
        const qty = Number(p.quantity || 1);
        const price = Number(p.price || 0);
        productQtyMap[p.productName] = (productQtyMap[p.productName] || 0) + qty;
        productRevMap[p.productName] = (productRevMap[p.productName] || 0) + (qty * price);
      });
    });

    const topProducts = Object.entries(productQtyMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const topProductsByRevenue = Object.entries(productRevMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    /* 🔹 Métodos de Pago y Tipos de Orden */
    const paymentMethodsMap: Record<string, number> = {};
    const orderTypesMap: Record<string, number> = {};
    const paymentRevenue = { efectivo: 0, tarjeta: 0, transferencia: 0, otros: 0 };
    let totalTips = 0;

    filteredOrders.forEach((order) => {
      const pm = order.paymentMethod?.toLowerCase() || "desconocido";
      const total = Number(order.total || 0);
      const tip = Number(order.tipAmount || 0);

      totalTips += tip;

      if (pm.includes("efectivo") || pm === "cash") {
        paymentRevenue.efectivo += total;
      } else if (pm.includes("tarjeta") || pm.includes("card") || pm.includes("crédito") || pm.includes("debito") || pm.includes("débito") || pm.includes("credito")) {
        paymentRevenue.tarjeta += total;
      } else if (pm.includes("transferencia") || pm.includes("nequi") || pm.includes("bancolombia") || pm.includes("daviplata") || pm.includes("pse")) {
        paymentRevenue.transferencia += total;
      } else {
        paymentRevenue.otros += total;
      }

      paymentMethodsMap[pm] = (paymentMethodsMap[pm] || 0) + 1;
      const ot = order.orderType || "no especificado";
      orderTypesMap[ot] = (orderTypesMap[ot] || 0) + 1;
    });

    const paymentMethods = Object.entries(paymentMethodsMap).map(([name, value]) => ({ name, value }));
    const orderTypes = Object.entries(orderTypesMap).map(([name, value]) => ({ name, value }));

    /* 🔹 Plan Guía Analysis */
    const totalGuiaDiscount = filteredOrders.reduce((sum, order) => sum + Number(order.guiaDiscount || 0), 0);

    /* 🔹 Horas Pico */
    const peakHoursMap: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      const date = toDate(order);
      const hour = date.getHours();
      const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
      peakHoursMap[formattedHour] = (peakHoursMap[formattedHour] || 0) + 1;
    });

    const peakHours = Object.entries(peakHoursMap)
      .map(([time, orders]) => ({ time, orders }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return {
      revenue,
      orders: ordersCount,
      users,
      ticketAvg,
      delivered,
      cancelled,
      revenueChart,
      topProducts,
      topProductsByRevenue,
      paymentMethods,
      orderTypes,
      peakHours,
      growth,
      paymentRevenue,
      totalTips,
      totalGuiaDiscount,
    };
  }, [orders, period, customDate]);
};
