import { roundMoney } from "../money";

// ==============================================================================
// Métricas Financieras y Reportes (HC Venta)
// ==============================================================================

export interface FinancialMetricsInput {
  totalSales: number;           // Ventas brutas totales
  totalCostOfGoodsSold: number; // Costo histórico de mercancía vendida (COGS)
  totalExpenses: number;        // Gastos del negocio efectivamente pagados (Renta, Luz, Sueldos, etc.)
  totalWithdrawals: number;     // Retiros de caja (NO son gastos, NO afectan utilidad)
  pendingCommitments?: number;  // Gastos programados pendientes del periodo (NO restan todavía de la utilidad real)
  cashSales?: number;
  cardSales?: number;
  transferSales?: number;
}

export interface FinancialMetricsResult {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;            // Utilidad neta real antes de compromisos pendientes
  isNetLoss: boolean;
  netLossAmount: number;
  pendingCommitments: number;   // Compromisos pendientes del periodo
  projectedNetProfit: number;   // Resultado proyectado tras cubrir compromisos pendientes
  isProjectedLoss: boolean;
  projectedLossAmount: number;
  totalWithdrawals: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

/**
 * Calcula el reporte financiero garantizando las reglas del negocio:
 * 1. Ganancia Bruta = Ventas - Costo de Mercancía Vendida (COGS)
 * 2. Ganancia Neta Real = Ganancia Bruta - Gastos Efectivamente Pagados
 * 3. Compromisos Pendientes = Gastos programados aún no pagados en el periodo
 * 4. Resultado Proyectado = Ganancia Neta Real - Compromisos Pendientes
 * 5. Los retiros NO disminuyen la ganancia neta; afectan únicamente el flujo de efectivo físico de caja.
 */
export function calculateFinancialMetrics(
  input: FinancialMetricsInput
): FinancialMetricsResult {
  const totalSales = roundMoney(input.totalSales);
  const totalCostOfGoodsSold = roundMoney(input.totalCostOfGoodsSold);
  const totalExpenses = roundMoney(input.totalExpenses);
  const totalWithdrawals = roundMoney(input.totalWithdrawals);
  const pendingCommitments = roundMoney(input.pendingCommitments || 0);

  const grossProfit = roundMoney(totalSales - totalCostOfGoodsSold);
  const netProfit = roundMoney(grossProfit - totalExpenses);
  const projectedNetProfit = roundMoney(netProfit - pendingCommitments);

  const isNetLoss = netProfit < 0;
  const netLossAmount = isNetLoss ? Math.abs(netProfit) : 0;

  const isProjectedLoss = projectedNetProfit < 0;
  const projectedLossAmount = isProjectedLoss ? Math.abs(projectedNetProfit) : 0;

  return {
    totalSales,
    totalCostOfGoodsSold,
    grossProfit,
    totalExpenses,
    netProfit,
    isNetLoss,
    netLossAmount,
    pendingCommitments,
    projectedNetProfit,
    isProjectedLoss,
    projectedLossAmount,
    totalWithdrawals,
    cashSales: roundMoney(input.cashSales || 0),
    cardSales: roundMoney(input.cardSales || 0),
    transferSales: roundMoney(input.transferSales || 0),
  };
}
