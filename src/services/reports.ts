import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateFinancialMetrics, FinancialMetricsResult } from "@/lib/reports/metrics";
import { roundMoney } from "@/lib/money";

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export interface AllTimeFinancialSummary {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  isNetLoss: boolean;
  pendingCommitments: number;
  projectedNetProfit: number;
  salesCount: number;
  topExpenseCategories: { category: string; amount: number }[];
}

export interface MonthlyBreakdownItem {
  month: number;
  monthName: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  pendingCommitments: number;
  projectedNetProfit: number;
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const categoryDisplayNames: Record<string, string> = {
  RENT: "Renta",
  UTILITIES: "Servicios (Luz / Agua)",
  SALARY: "Sueldos",
  TRANSPORT: "Transporte",
  MAINTENANCE: "Mantenimiento",
  OTHER: "Otros Gastos",
};

export async function getFinancialReport(filter: DateRangeFilter) {
  const { startDate, endDate } = filter;

  // 1. Consultar ventas en el periodo (inmutables, respetan historial, excluyendo canceladas)
  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
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

  // 2. Consultar gastos del negocio efectivamente pagados en el periodo
  const expenses = await prisma.expense.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // 3. Consultar gastos programados pendientes (compromisos futuros dentro del periodo)
  const pendingScheduledExpenses = await prisma.scheduledExpense.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: "PENDING",
    },
    orderBy: { dueDate: "asc" },
  });

  // 4. Consultar retiros de caja (NO son gastos operativos)
  const withdrawals = await prisma.cashMovement.findMany({
    where: {
      type: "WITHDRAWAL",
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // 5. Consultar resumen histórico acumulado (all-time) para contexto comparativo (solo ventas efectivas)
  const [allSalesAgg, allExpensesList, allPendingAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
      },
      _sum: {
        total: true,
        totalCost: true,
      },
      _count: { id: true },
    }),
    prisma.expense.findMany({
      select: { amount: true, category: true },
    }),
    prisma.scheduledExpense.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  // Totales del periodo seleccionado
  let totalSales = 0;
  let totalCOGS = 0;
  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;

  const salesByDayMap = new Map<string, number>();
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
  const pendingCommitments = pendingScheduledExpenses.reduce((sum, s) => sum + Number(s.amount), 0);

  // Gastos por categoría en el periodo
  const expensesByCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = categoryDisplayNames[e.category] || e.category;
    expensesByCategoryMap.set(cat, (expensesByCategoryMap.get(cat) || 0) + Number(e.amount));
  }

  const metrics: FinancialMetricsResult = calculateFinancialMetrics({
    totalSales,
    totalCostOfGoodsSold: totalCOGS,
    totalExpenses,
    totalWithdrawals,
    pendingCommitments,
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

  // Calcular Resumen Histórico Acumulado (All-Time)
  const allTimeTotalSales = Number(allSalesAgg._sum.total || 0);
  const allTimeTotalCOGS = Number(allSalesAgg._sum.totalCost || 0);
  const allTimeGrossProfit = roundMoney(allTimeTotalSales - allTimeTotalCOGS);
  const allTimeTotalExpenses = allExpensesList.reduce((sum, e) => sum + Number(e.amount), 0);
  const allTimeNetProfit = roundMoney(allTimeGrossProfit - allTimeTotalExpenses);
  const allTimePendingCommitments = Number(allPendingAgg._sum.amount || 0);
  const allTimeProjectedNetProfit = roundMoney(allTimeNetProfit - allTimePendingCommitments);

  const allTimeCategoryMap = new Map<string, number>();
  for (const e of allExpensesList) {
    const cat = categoryDisplayNames[e.category] || e.category;
    allTimeCategoryMap.set(cat, (allTimeCategoryMap.get(cat) || 0) + Number(e.amount));
  }
  const allTimeTopExpenseCategories = Array.from(allTimeCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const allTimeSummary: AllTimeFinancialSummary = {
    totalSales: allTimeTotalSales,
    totalCostOfGoodsSold: allTimeTotalCOGS,
    grossProfit: allTimeGrossProfit,
    totalExpenses: allTimeTotalExpenses,
    netProfit: allTimeNetProfit,
    isNetLoss: allTimeNetProfit < 0,
    pendingCommitments: allTimePendingCommitments,
    projectedNetProfit: allTimeProjectedNetProfit,
    salesCount: allSalesAgg._count.id || 0,
    topExpenseCategories: allTimeTopExpenseCategories,
  };

  // Encontrar años disponibles en la base de datos
  const currentYear = new Date().getFullYear();
  const availableYearsSet = new Set<number>([currentYear]);
  if (sales.length > 0) {
    sales.forEach((s) => availableYearsSet.add(s.createdAt.getFullYear()));
  }
  const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

  return {
    metrics,
    salesCount: sales.length,
    salesByDay,
    topProducts,
    expensesByCategory,
    pendingScheduledExpenses: pendingScheduledExpenses.map((s) => ({
      id: s.id,
      concept: s.concept,
      category: categoryDisplayNames[s.category] || s.category,
      amount: Number(s.amount),
      dueDate: s.dueDate.toISOString(),
      isRecurring: s.isRecurring,
      frequency: s.frequency,
      status: s.status,
      notes: s.notes,
    })),
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
    allTimeSummary,
    availableYears,
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

export async function getYearlyReport(year: number) {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const baseReport = await getFinancialReport({ startDate: start, endDate: end });

  // Calcular desglose mensual (12 meses) para análisis de tendencias
  // Consultamos todas las ventas, gastos y compromisos del año para mapear por mes
  const [yearSales, yearExpenses, yearScheduled] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, total: true, totalCost: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
    prisma.scheduledExpense.findMany({
      where: { dueDate: { gte: start, lte: end }, status: "PENDING" },
      select: { dueDate: true, amount: true },
    }),
  ]);

  const yearlyBreakdown: MonthlyBreakdownItem[] = Array.from({ length: 12 }, (_, monthIndex) => {
    let sales = 0;
    let cogs = 0;
    let expenses = 0;
    let pendingCommitments = 0;

    for (const s of yearSales) {
      if (s.createdAt.getMonth() === monthIndex) {
        sales += Number(s.total);
        cogs += Number(s.totalCost);
      }
    }

    for (const e of yearExpenses) {
      if (e.date.getMonth() === monthIndex) {
        expenses += Number(e.amount);
      }
    }

    for (const p of yearScheduled) {
      if (p.dueDate.getMonth() === monthIndex) {
        pendingCommitments += Number(p.amount);
      }
    }

    sales = roundMoney(sales);
    cogs = roundMoney(cogs);
    expenses = roundMoney(expenses);
    pendingCommitments = roundMoney(pendingCommitments);
    const grossProfit = roundMoney(sales - cogs);
    const netProfit = roundMoney(grossProfit - expenses);
    const projectedNetProfit = roundMoney(netProfit - pendingCommitments);

    return {
      month: monthIndex,
      monthName: MONTH_NAMES[monthIndex],
      sales,
      cogs,
      grossProfit,
      expenses,
      netProfit,
      pendingCommitments,
      projectedNetProfit,
    };
  });

  return {
    ...baseReport,
    yearlyBreakdown,
  };
}

export async function getCustomReport(startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return getFinancialReport({ startDate: start, endDate: end });
}

export async function getAllTimeReport() {
  const start = new Date("2020-01-01T00:00:00.000Z");
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return getFinancialReport({ startDate: start, endDate: end });
}
