import { roundMoney } from "../money";

// ==============================================================================
// Cálculos de Venta, Carrito, Descuentos y Pagos (HC Venta)
// ==============================================================================

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export interface CartItemInput {
  productId: string;
  name: string;
  originalPrice: number;
  customPrice?: number | null;
  unitCost: number;
  quantity: number;
  discountType?: DiscountType | null;
  discountValue?: number;
}

export interface CalculatedCartItem {
  productId: string;
  name: string;
  quantity: number;
  originalPrice: number;
  unitPrice: number;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;
  unitCost: number;
  subtotal: number;
  totalCost: number;
  profit: number;
  isLoss: boolean;
}

export interface CartCalculationResult {
  items: CalculatedCartItem[];
  itemsSubtotal: number;
  cartDiscountType: DiscountType | null;
  cartDiscountValue: number;
  cartDiscountAmount: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  hasLossItem: boolean;
  isNetLoss: boolean;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number; // Para efectivo recibido
}

export interface PaymentValidationResult {
  isValid: boolean;
  totalPaid: number;
  remainingBalance: number;
  changeGiven: number;
  status: "EXACT" | "CHANGE" | "PENDING" | "INVALID";
  errorMessage?: string;
}

/**
 * Calcula un artículo individual del carrito respetando precios personalizados,
 * descuentos unitarios y manteniendo la fotografía histórica del costo y utilidad.
 */
export function calculateCartItem(item: CartItemInput): CalculatedCartItem {
  if (item.quantity <= 0) {
    throw new Error("La cantidad debe ser un entero mayor a cero.");
  }

  const originalPrice = roundMoney(item.originalPrice);
  const unitCost = roundMoney(item.unitCost);
  const quantity = Math.floor(item.quantity);

  // 1. Determinar precio base (si tiene precio personalizado tiene prioridad)
  let unitPrice = item.customPrice !== undefined && item.customPrice !== null
    ? roundMoney(item.customPrice)
    : originalPrice;

  let discountAmountPerUnit = 0;
  const discountType = item.discountType || null;
  const discountValue = item.discountValue ? roundMoney(item.discountValue) : 0;

  // 2. Aplicar descuento por artículo si no se asignó precio personalizado manual
  if (item.customPrice === undefined || item.customPrice === null) {
    if (discountType === "PERCENTAGE" && discountValue > 0) {
      discountAmountPerUnit = roundMoney(originalPrice * (discountValue / 100));
      unitPrice = Math.max(0, roundMoney(originalPrice - discountAmountPerUnit));
    } else if (discountType === "FIXED_AMOUNT" && discountValue > 0) {
      discountAmountPerUnit = Math.min(originalPrice, discountValue);
      unitPrice = Math.max(0, roundMoney(originalPrice - discountAmountPerUnit));
    }
  } else {
    // Si hubo precio personalizado, la diferencia con el precio original se registra
    discountAmountPerUnit = Math.max(0, roundMoney(originalPrice - unitPrice));
  }

  const subtotal = roundMoney(unitPrice * quantity);
  const totalCost = roundMoney(unitCost * quantity);
  const profit = roundMoney(subtotal - totalCost);
  const totalDiscountAmount = roundMoney(discountAmountPerUnit * quantity);

  return {
    productId: item.productId,
    name: item.name,
    quantity,
    originalPrice,
    unitPrice,
    discountType,
    discountValue,
    discountAmount: totalDiscountAmount,
    unitCost,
    subtotal,
    totalCost,
    profit,
    isLoss: profit < 0,
  };
}

/**
 * Calcula los totales del carrito completo con soporte para descuento global.
 */
export function calculateCart(
  items: CartItemInput[],
  cartDiscount?: { type: DiscountType; value: number } | null
): CartCalculationResult {
  const calculatedItems = items.map(calculateCartItem);

  const itemsSubtotal = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const totalCost = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.totalCost, 0)
  );

  let cartDiscountAmount = 0;
  const cartDiscountType = cartDiscount?.type || null;
  const cartDiscountValue = cartDiscount?.value ? roundMoney(cartDiscount.value) : 0;

  if (cartDiscountType === "PERCENTAGE" && cartDiscountValue > 0) {
    cartDiscountAmount = roundMoney(itemsSubtotal * (cartDiscountValue / 100));
  } else if (cartDiscountType === "FIXED_AMOUNT" && cartDiscountValue > 0) {
    cartDiscountAmount = Math.min(itemsSubtotal, cartDiscountValue);
  }

  const total = Math.max(0, roundMoney(itemsSubtotal - cartDiscountAmount));
  const grossProfit = roundMoney(total - totalCost);

  return {
    items: calculatedItems,
    itemsSubtotal,
    cartDiscountType,
    cartDiscountValue,
    cartDiscountAmount,
    total,
    totalCost,
    grossProfit,
    hasLossItem: calculatedItems.some((i) => i.isLoss),
    isNetLoss: grossProfit < 0,
  };
}

/**
 * Valida los métodos de pago contra el total de la venta:
 * - Tarjeta y transferencia NO pueden exceder el saldo pendiente.
 * - Efectivo puede exceder y generar cambio.
 * - Pagos combinados deben totalizar exactamente la venta.
 */
export function validatePayments(
  totalToPay: number,
  payments: PaymentInput[]
): PaymentValidationResult {
  const total = roundMoney(totalToPay);
  if (total <= 0 && payments.length === 0) {
    return {
      isValid: true,
      totalPaid: 0,
      remainingBalance: 0,
      changeGiven: 0,
      status: "EXACT",
    };
  }

  let accumulatedTowardsSale = 0;
  let totalCashGiven = 0;
  let changeGiven = 0;

  for (const p of payments) {
    const amount = roundMoney(p.amount);
    if (amount <= 0) continue;

    const remainingBeforeThisPayment = roundMoney(total - accumulatedTowardsSale);

    if (p.method === "CARD" || p.method === "TRANSFER") {
      // Regla 25: Tarjeta y transferencia no pueden superar el saldo pendiente
      if (amount > remainingBeforeThisPayment) {
        return {
          isValid: false,
          totalPaid: accumulatedTowardsSale,
          remainingBalance: remainingBeforeThisPayment,
          changeGiven: 0,
          status: "INVALID",
          errorMessage: `El monto en ${p.method === "CARD" ? "tarjeta" : "transferencia"} ($${amount}) supera el saldo pendiente ($${remainingBeforeThisPayment}).`,
        };
      }
      accumulatedTowardsSale = roundMoney(accumulatedTowardsSale + amount);
    } else if (p.method === "CASH") {
      const received = p.receivedAmount !== undefined ? roundMoney(p.receivedAmount) : amount;
      totalCashGiven = roundMoney(totalCashGiven + received);

      if (received >= remainingBeforeThisPayment) {
        // Cubre o supera el saldo restante
        accumulatedTowardsSale = roundMoney(accumulatedTowardsSale + remainingBeforeThisPayment);
        changeGiven = roundMoney(changeGiven + (received - remainingBeforeThisPayment));
      } else {
        accumulatedTowardsSale = roundMoney(accumulatedTowardsSale + received);
      }
    }
  }

  const remainingBalance = Math.max(0, roundMoney(total - accumulatedTowardsSale));

  if (remainingBalance > 0) {
    return {
      isValid: false,
      totalPaid: accumulatedTowardsSale,
      remainingBalance,
      changeGiven: 0,
      status: "PENDING",
      errorMessage: `Faltante de pago: $${remainingBalance.toFixed(2)}`,
    };
  }

  if (changeGiven > 0) {
    return {
      isValid: true,
      totalPaid: roundMoney(accumulatedTowardsSale + changeGiven),
      remainingBalance: 0,
      changeGiven,
      status: "CHANGE",
    };
  }

  return {
    isValid: true,
    totalPaid: accumulatedTowardsSale,
    remainingBalance: 0,
    changeGiven: 0,
    status: "EXACT",
  };
}
