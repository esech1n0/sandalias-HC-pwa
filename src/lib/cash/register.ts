import { roundMoney } from "../money";

// ==============================================================================
// Lógica de Operaciones y Corte de Caja (HC Venta)
// ==============================================================================

export interface CashRegisterCalculationInput {
  openingBalance: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  withdrawalsTotal: number;
  depositsTotal?: number;
  expensesCashTotal: number;
  countedCash?: number | null;
}

export interface CashRegisterCalculationResult {
  openingBalance: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  totalSales: number;
  withdrawalsTotal: number;
  depositsTotal: number;
  expensesCashTotal: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  isBalanced: boolean;
}

/**
 * Calcula los totales y el cuadre de caja (corte diario).
 * 
 * Regla:
 * Efectivo Esperado = Fondo Inicial + Ventas Efectivo + Ingresos - Retiros - Gastos/Compras en Efectivo
 * Diferencia = Efectivo Contado - Efectivo Esperado
 */
export function calculateCashRegister(
  input: CashRegisterCalculationInput
): CashRegisterCalculationResult {
  const openingBalance = roundMoney(input.openingBalance);
  const cashSales = roundMoney(input.cashSales);
  const cardSales = roundMoney(input.cardSales);
  const transferSales = roundMoney(input.transferSales);
  const withdrawalsTotal = roundMoney(input.withdrawalsTotal);
  const depositsTotal = roundMoney(input.depositsTotal || 0);
  const expensesCashTotal = roundMoney(input.expensesCashTotal);

  const totalSales = roundMoney(cashSales + cardSales + transferSales);

  const expectedCash = roundMoney(
    openingBalance + cashSales + depositsTotal - withdrawalsTotal - expensesCashTotal
  );

  let difference: number | null = null;
  let countedCash: number | null = null;

  if (input.countedCash !== undefined && input.countedCash !== null) {
    countedCash = roundMoney(input.countedCash);
    difference = roundMoney(countedCash - expectedCash);
  }

  return {
    openingBalance,
    cashSales,
    cardSales,
    transferSales,
    totalSales,
    withdrawalsTotal,
    depositsTotal,
    expensesCashTotal,
    expectedCash,
    countedCash,
    difference,
    isBalanced: difference !== null ? difference === 0 : false,
  };
}
