import { useMemo } from "react";
import { Order } from "../interfaces/Order";

export type Period = "day" | "week" | "month" | "year";

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

const getStartOfPeriod = (period: Period): Date => {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case "day":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "year":
      start.setDate(now.getDate() - 364);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return start;
};

const getPreviousPeriodRange = (period: Period): { start: Date; end: Date } => {
  const startCurrent = getStartOfPeriod(period);
  const end = new Date(startCurrent);
  end.setMilliseconds(-1);

  const start = new Date(startCurrent);
  switch (period) {
    case "day":
      start.setDate(start.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setDate(start.getDate() - 30);
      break;
    case "year":
      start.setDate(start.getDate() - 365);
      break;
  }
  return { start, end };
};

/* =========================
   ANALYTICS HOOK
========================= */
export const useAnalytics = (orders: Order[], period: Period) => {
  return useMemo(() => {
    const startOfPeriod = getStartOfPeriod(period);
    const { start: startPrev, end: endPrev } = getPreviousPeriodRange(period);

    /* 🔹 Filtrar por períodos */
    const filteredOrders = orders.filter((order) => {
      const date = toDate(order);
      return date >= startOfPeriod;
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

    filteredOrders.forEach((order) => {
      const pm = order.paymentMethod?.toLowerCase() || "desconocido";
      paymentMethodsMap[pm] = (paymentMethodsMap[pm] || 0) + 1;
      const ot = order.orderType || "no especificado";
      orderTypesMap[ot] = (orderTypesMap[ot] || 0) + 1;
    });

    const paymentMethods = Object.entries(paymentMethodsMap).map(([name, value]) => ({ name, value }));
    const orderTypes = Object.entries(orderTypesMap).map(([name, value]) => ({ name, value }));

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
    };
  }, [orders, period]);
};
