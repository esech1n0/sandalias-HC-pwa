import { roundMoney } from "../money";

// ==============================================================================
// Métricas Financieras y Reportes (HC Venta)
// ==============================================================================

export interface FinancialMetricsInput {
  totalSales: number;       // Ventas brutas totales
  totalCostOfGoodsSold: number; // Costo histórico de mercancía vendida (COGS)
  totalExpenses: number;    // Gastos del negocio (Renta, Luz, Sueldos, etc.)
  totalWithdrawals: number; // Retiros de caja (NO son gastos, NO afectan utilidad)
  cashSales?: number;
  cardSales?: number;
  transferSales?: number;
}

export interface FinancialMetricsResult {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  isNetLoss: boolean;
  netLossAmount: number;
  totalWithdrawals: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

/**
 * Calcula el reporte financiero garantizando las reglas del negocio:
 * 1. Ganancia Bruta = Ventas - Costo de Mercancía Vendida (COGS)
 * 2. Ganancia Neta = Ganancia Bruta - Gastos
 * 3. Los retiros NO disminuyen la ganancia neta; afectan el flujo de efectivo físico.
 */
export function calculateFinancialMetrics(
  input: FinancialMetricsInput
): FinancialMetricsResult {
  const totalSales = roundMoney(input.totalSales);
  const totalCostOfGoodsSold = roundMoney(input.totalCostOfGoodsSold);
  const totalExpenses = roundMoney(input.totalExpenses);
  const totalWithdrawals = roundMoney(input.totalWithdrawals);

  const grossProfit = roundMoney(totalSales - totalCostOfGoodsSold);
  const netProfit = roundMoney(grossProfit - totalExpenses);

  const isNetLoss = netProfit < 0;
  const netLossAmount = isNetLoss ? Math.abs(netProfit) : 0;

  return {
    totalSales,
    totalCostOfGoodsSold,
    grossProfit,
    totalExpenses,
    netProfit,
    isNetLoss,
    netLossAmount,
    totalWithdrawals,
    cashSales: roundMoney(input.cashSales || 0),
    cardSales: roundMoney(input.cardSales || 0),
    transferSales: roundMoney(input.transferSales || 0),
  };
}
