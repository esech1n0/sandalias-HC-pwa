import { roundMoney } from "../money";

/**
 * Módulo de cálculo y validación de comisiones bancarias por pago con tarjeta.
 */

export interface CardCommissionCalculation {
  cardAmount: number;
  rateApplied: number;
  commissionAmount: number;
  netReceived: number;
  hasCommission: boolean;
}

export interface SaleProfitSummary {
  totalSale: number;
  totalCost: number;
  profitBeforeCommission: number;
  cardCommissionAmount: number;
  profitAfterCommission: number;
  hasIncompleteCost: boolean;
  isNetLoss: boolean;
}

/**
 * Valida el porcentaje de comisión.
 * - Debe ser numérico y mayor o igual a 0.
 * - No puede ser mayor a 100.
 * - Acepta decimales (ej. 2.5, 3.25, 3.5).
 */
export function validateCommissionRate(rate: string | number): {
  isValid: boolean;
  parsedRate: number;
  error?: string;
} {
  const num = typeof rate === "number" ? rate : parseFloat(rate);

  if (isNaN(num)) {
    return {
      isValid: false,
      parsedRate: 0,
      error: "El porcentaje de comisión debe ser un valor numérico.",
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      parsedRate: 0,
      error: "El porcentaje de comisión no puede ser negativo.",
    };
  }

  if (num > 100) {
    return {
      isValid: false,
      parsedRate: 100,
      error: "El porcentaje de comisión no puede ser mayor a 100%.",
    };
  }

  return {
    isValid: true,
    parsedRate: roundMoney(num),
  };
}

/**
 * Calcula la comisión bancaria e importe neto recibido sobre el importe pagado con tarjeta.
 *
 * Fórmula:
 * Comisión bancaria = Importe pagado con tarjeta × (Porcentaje de comisión / 100)
 * Neto recibido = Importe pagado con tarjeta − Comisión bancaria
 */
export function calculateCardCommission(params: {
  cardAmount: number;
  rate: number;
  isEnabled: boolean;
}): CardCommissionCalculation {
  const cardAmount = Math.max(0, roundMoney(params.cardAmount));
  const rate = Math.max(0, Math.min(100, params.rate));
  const isEnabled = params.isEnabled;

  if (!isEnabled || cardAmount <= 0 || rate <= 0) {
    return {
      cardAmount,
      rateApplied: rate,
      commissionAmount: 0,
      netReceived: cardAmount,
      hasCommission: false,
    };
  }

  const commissionAmount = roundMoney(cardAmount * (rate / 100));
  const netReceived = roundMoney(cardAmount - commissionAmount);

  return {
    cardAmount,
    rateApplied: rate,
    commissionAmount,
    netReceived,
    hasCommission: true,
  };
}

/**
 * Calcula el resumen de ganancia real estimada de la venta:
 * - Ganancia antes de comisión = Total de la venta − Costo de adquisición de los productos
 * - Ganancia después de comisión = Ganancia antes de comisión − Comisión bancaria
 */
export function calculateSaleProfitSummary(params: {
  totalSale: number;
  totalCost: number;
  cardCommissionAmount: number;
  hasIncompleteCost?: boolean;
}): SaleProfitSummary {
  const totalSale = roundMoney(params.totalSale);
  const totalCost = roundMoney(params.totalCost);
  const cardCommissionAmount = Math.max(0, roundMoney(params.cardCommissionAmount));
  const hasIncompleteCost = Boolean(params.hasIncompleteCost);

  const profitBeforeCommission = roundMoney(totalSale - totalCost);
  const profitAfterCommission = roundMoney(profitBeforeCommission - cardCommissionAmount);

  return {
    totalSale,
    totalCost,
    profitBeforeCommission,
    cardCommissionAmount,
    profitAfterCommission,
    hasIncompleteCost,
    isNetLoss: profitAfterCommission < 0,
  };
}
