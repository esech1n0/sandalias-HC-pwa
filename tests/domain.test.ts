import { describe, it, expect } from "vitest";
import {
  calculateWeightedAverageCost,
  validateStockAvailability,
} from "../src/lib/inventory/cost";
import {
  calculateCart,
  calculateCartItem,
  validatePayments,
} from "../src/lib/sales/calculations";
import { calculateCashRegister } from "../src/lib/cash/register";
import { calculateFinancialMetrics } from "../src/lib/reports/metrics";

describe("HC Venta - Reglas de Negocio e Integridad Financiera", () => {
  // --------------------------------------------------------------------------
  // 1. Pruebas de Pagos (Sección 59 de INSTRUCTIONS.md)
  // --------------------------------------------------------------------------
  describe("Validación de Pagos y Cambio", () => {
    it("Venta $300 + efectivo $500 = cambio $200", () => {
      const res = validatePayments(300, [
        { method: "CASH", amount: 300, receivedAmount: 500 },
      ]);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("CHANGE");
      expect(res.changeGiven).toBe(200);
      expect(res.remainingBalance).toBe(0);
    });

    it("Venta $300 + efectivo $250 = faltante $50", () => {
      const res = validatePayments(300, [
        { method: "CASH", amount: 250, receivedAmount: 250 },
      ]);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("PENDING");
      expect(res.remainingBalance).toBe(50);
      expect(res.changeGiven).toBe(0);
    });

    it("Venta $300 + tarjeta $300 = pago exacto", () => {
      const res = validatePayments(300, [
        { method: "CARD", amount: 300 },
      ]);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("EXACT");
      expect(res.changeGiven).toBe(0);
      expect(res.remainingBalance).toBe(0);
    });

    it("Venta $500: efectivo $200 + tarjeta $300 = pago válido", () => {
      const res = validatePayments(500, [
        { method: "CASH", amount: 200, receivedAmount: 200 },
        { method: "CARD", amount: 300 },
      ]);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("EXACT");
      expect(res.remainingBalance).toBe(0);
    });

    it("Venta $500: tarjeta $600 = pago inválido (no puede superar saldo pendiente)", () => {
      const res = validatePayments(500, [
        { method: "CARD", amount: 600 },
      ]);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("INVALID");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pruebas de Inventario y Costeo (Secciones 12, 16, 60)
  // --------------------------------------------------------------------------
  describe("Inventario y Promedio Ponderado", () => {
    it("Valida disponibilidad de stock", () => {
      expect(validateStockAvailability(10, 3)).toBe(true);
      expect(validateStockAvailability(2, 3)).toBe(false);
      expect(validateStockAvailability(0, 1)).toBe(false);
    });

    it("Calcula correctamente el Promedio Ponderado en compras", () => {
      // 10 unidades a $150 + 10 unidades a $170 = 20 unidades a $160
      const cost1 = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 150,
        newQuantity: 10,
        newUnitCost: 170,
      });
      expect(cost1).toBe(160);

      // Stock 0 o negativo adquiere costo nuevo
      const costInitial = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 0,
        newQuantity: 5,
        newUnitCost: 200,
      });
      expect(costInitial).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Pruebas de Carrito, Descuentos y Precios Personalizados
  // --------------------------------------------------------------------------
  describe("Carrito, Precios Personalizados y Descuentos", () => {
    it("Calcula artículo con precio personalizado y utilidad negativa si aplica", () => {
      const item = calculateCartItem({
        productId: "p1",
        name: "Sandalia X",
        originalPrice: 300,
        customPrice: 150, // Vendido por debajo de costo
        unitCost: 180,
        quantity: 2,
      });

      expect(item.subtotal).toBe(300); // 150 * 2
      expect(item.totalCost).toBe(360); // 180 * 2
      expect(item.profit).toBe(-60); // Pérdida de $60
      expect(item.isLoss).toBe(true);
    });

    it("Aplica descuentos en porcentaje y monto fijo", () => {
      const itemPercent = calculateCartItem({
        productId: "p2",
        name: "Sandalia Y",
        originalPrice: 200,
        unitCost: 100,
        quantity: 1,
        discountType: "PERCENTAGE",
        discountValue: 10, // 10% de 200 = 20 de descuento
      });
      expect(itemPercent.unitPrice).toBe(180);
      expect(itemPercent.subtotal).toBe(180);
      expect(itemPercent.profit).toBe(80);

      const cart = calculateCart(
        [
          {
            productId: "p3",
            name: "Pantufla Z",
            originalPrice: 200,
            unitCost: 100,
            quantity: 2, // subtotal = 400
          },
        ],
        { type: "FIXED_AMOUNT", value: 50 } // Descuento global al carrito
      );
      expect(cart.itemsSubtotal).toBe(400);
      expect(cart.cartDiscountAmount).toBe(50);
      expect(cart.total).toBe(350);
      expect(cart.totalCost).toBe(200);
      expect(cart.grossProfit).toBe(150);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Pruebas de Caja y Retiros (Sección 28, 30, 32)
  // --------------------------------------------------------------------------
  describe("Corte de Caja", () => {
    it("Calcula efectivo esperado y diferencia en corte diario", () => {
      const corte = calculateCashRegister({
        openingBalance: 1000,
        cashSales: 5300,
        cardSales: 1200,
        transferSales: 800,
        withdrawalsTotal: 500, // Retiro
        expensesCashTotal: 0,
        countedCash: 5750,
      });

      // 1000 + 5300 - 500 = 5800 esperado
      expect(corte.expectedCash).toBe(5800);
      expect(corte.difference).toBe(-50); // Faltante de $50
      expect(corte.isBalanced).toBe(false);
      expect(corte.totalSales).toBe(7300);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Pruebas de Reportes y Separación de Retiros vs Gastos (Sección 61)
  // --------------------------------------------------------------------------
  describe("Reportes Financieros (Caso controlado de INSTRUCTIONS.md)", () => {
    it("Venta $1,000, Costo $600, Gastos $100 => Ganancia bruta $400, Ganancia neta $300. Retiro $200 NO afecta utilidad", () => {
      const reporte = calculateFinancialMetrics({
        totalSales: 1000,
        totalCostOfGoodsSold: 600,
        totalExpenses: 100,
        totalWithdrawals: 200, // El retiro NO es gasto
      });

      expect(reporte.grossProfit).toBe(400);
      expect(reporte.netProfit).toBe(300); // Permanece en 300 a pesar del retiro
      expect(reporte.isNetLoss).toBe(false);
    });
  });
});
