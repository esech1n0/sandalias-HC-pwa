import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateFinancialMetrics } from "@/lib/reports/metrics";

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export async function getFinancialReport(filter: DateRangeFilter) {
  const { startDate, endDate } = filter;

  // 1. Consultar ventas en el periodo
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: true,
      payments: true,
    },
  });

  // 2. Consultar gastos del negocio
  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // 3. Consultar retiros de caja (NO gastos)
  const withdrawals = await prisma.cashMovement.findMany({
    where: {
      type: "WITHDRAWAL",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Totales acumulados
  let totalSales = 0;
  let totalCOGS = 0;
  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;

  // Mapeo por día para gráfica
  const salesByDayMap = new Map<string, number>();

  // Productos vendidos acumulados
  const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const sale of sales) {
    const saleTotal = Number(sale.total);
    const saleCost = Number(sale.totalCost);

    totalSales += saleTotal;
    totalCOGS += saleCost;

    const dayKey = sale.createdAt.toISOString().slice(0, 10);
    salesByDayMap.set(dayKey, (salesByDayMap.get(dayKey) || 0) + saleTotal);

    for (const p of sale.payments) {
      const amount = Number(p.amount);
      if (p.method === "CASH") cashSales += amount;
      else if (p.method === "CARD") cardSales += amount;
      else if (p.method === "TRANSFER") transferSales += amount;
    }

    for (const item of sale.items) {
      const existing = productSalesMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += Number(item.subtotal);
      } else {
        productSalesMap.set(item.productId, {
          name: item.productName,
          quantity: item.quantity,
          revenue: Number(item.subtotal),
        });
      }
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);

  // Mapeo amigable para categorías
  const categoryDisplayNames: Record<string, string> = {
    RENT: "Renta",
    UTILITIES: "Servicios (Luz / Agua)",
    SALARY: "Sueldos",
    TRANSPORT: "Transporte",
    MAINTENANCE: "Mantenimiento",
    OTHER: "Otros Gastos",
  };

  // Gastos por categoría
  const expensesByCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = categoryDisplayNames[e.category] || e.category;
    expensesByCategoryMap.set(cat, (expensesByCategoryMap.get(cat) || 0) + Number(e.amount));
  }

  const metrics = calculateFinancialMetrics({
    totalSales,
    totalCostOfGoodsSold: totalCOGS,
    totalExpenses,
    totalWithdrawals,
    cashSales,
    cardSales,
    transferSales,
  });

  const salesByDay = Array.from(salesByDayMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));

  return {
    metrics,
    salesCount: sales.length,
    salesByDay,
    topProducts,
    expensesByCategory,
    expensesList: expenses.map((e) => ({
      id: e.id,
      concept: e.concept,
      category: categoryDisplayNames[e.category] || e.category,
      amount: Number(e.amount),
      date: e.date.toISOString(),
      paymentMethod: e.paymentMethod,
      description: e.description,
      cashRegisterId: e.cashRegisterId,
      userId: e.userId,
      createdAt: e.createdAt.toISOString(),
    })),
    withdrawalsList: withdrawals.map((w) => ({
      id: w.id,
      cashRegisterId: w.cashRegisterId,
      type: w.type,
      amount: Number(w.amount),
      reason: w.reason,
      userId: w.userId,
      createdAt: w.createdAt.toISOString(),
    })),
  };
}

export async function getDailyReport(date: Date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return getFinancialReport({ startDate: start, endDate: end });
}

export async function getWeeklyReport(date: Date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); // lunes

  const start = new Date(current.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return getFinancialReport({ startDate: start, endDate: end });
}

export async function getMonthlyReport(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return getFinancialReport({ startDate: start, endDate: end });
}
