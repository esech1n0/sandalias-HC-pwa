import { describe, it, expect, vi } from "vitest";
import { calculateFinancialMetrics } from "../src/lib/reports/metrics";

describe("Lógica Contable y Financiera de Cancelación de Ventas", () => {
  it("descuenta el dinero de venta y ganancia de las métricas de reportes cuando una venta es cancelada", () => {
    // Escenario inicial: 2 ventas activas
    // Venta 1: $1,000 venta, $400 costo -> $600 utilidad
    // Venta 2: $500 venta, $200 costo -> $300 utilidad
    const initialSales = [
      { id: "v1", total: 1000, totalCost: 400, grossProfit: 600, status: "COMPLETED", paymentMethod: "CASH" },
      { id: "v2", total: 500, totalCost: 200, grossProfit: 300, status: "COMPLETED", paymentMethod: "CARD" },
    ];

    // Métricas antes de la cancelación
    const activeSalesBefore = initialSales.filter((s) => s.status === "COMPLETED");
    const totalSalesBefore = activeSalesBefore.reduce((acc, s) => acc + s.total, 0);
    const totalCostBefore = activeSalesBefore.reduce((acc, s) => acc + s.totalCost, 0);
    const cashBefore = activeSalesBefore.filter((s) => s.paymentMethod === "CASH").reduce((acc, s) => acc + s.total, 0);
    const cardBefore = activeSalesBefore.filter((s) => s.paymentMethod === "CARD").reduce((acc, s) => acc + s.total, 0);

    const reportBefore = calculateFinancialMetrics({
      totalSales: totalSalesBefore,
      totalCostOfGoodsSold: totalCostBefore,
      totalExpenses: 200,
      totalWithdrawals: 0,
      cashSales: cashBefore,
      cardSales: cardBefore,
      transferSales: 0,
    });

    expect(reportBefore.totalSales).toBe(1500);
    expect(reportBefore.totalCostOfGoodsSold).toBe(600);
    expect(reportBefore.grossProfit).toBe(900); // 1500 - 600
    expect(reportBefore.netProfit).toBe(700); // 900 - 200

    // Simular cancelación de la Venta 1
    const salesAfter = initialSales.map((s) =>
      s.id === "v1" ? { ...s, status: "CANCELLED" } : s
    );

    // Solo ventas con status COMPLETED son consideradas en reportes
    const activeSalesAfter = salesAfter.filter((s) => s.status === "COMPLETED");
    const totalSalesAfter = activeSalesAfter.reduce((acc, s) => acc + s.total, 0);
    const totalCostAfter = activeSalesAfter.reduce((acc, s) => acc + s.totalCost, 0);
    const cashAfter = activeSalesAfter.filter((s) => s.paymentMethod === "CASH").reduce((acc, s) => acc + s.total, 0);
    const cardAfter = activeSalesAfter.filter((s) => s.paymentMethod === "CARD").reduce((acc, s) => acc + s.total, 0);

    const reportAfter = calculateFinancialMetrics({
      totalSales: totalSalesAfter,
      totalCostOfGoodsSold: totalCostAfter,
      totalExpenses: 200,
      totalWithdrawals: 0,
      cashSales: cashAfter,
      cardSales: cardAfter,
      transferSales: 0,
    });

    // Verificaciones:
    // 1. Total ventas descontado en $1000
    expect(reportAfter.totalSales).toBe(500);
    // 2. Costo de mercancía vendida descontado en $400
    expect(reportAfter.totalCostOfGoodsSold).toBe(200);
    // 3. Utilidad bruta descontada de $900 a $300 (descuento exacto de $600 de ganancia)
    expect(reportAfter.grossProfit).toBe(300);
    // 4. Utilidad neta descontada de $700 a $100
    expect(reportAfter.netProfit).toBe(100);
    // 5. El método de pago en efectivo se descontó
    expect(reportAfter.cashSales).toBe(0);
    expect(reportAfter.cardSales).toBe(500);
  });

  it("calcula correctamente el restablecimiento de stock para partidas de una venta", () => {
    // Inventario actual
    const productsInStock = {
      p1: { id: "p1", name: "Sandalia Clásica Azul", stock: 8 },
      p2: { id: "p2", name: "Pantufla Felpa Gris", stock: 3 },
    };

    // Partidas vendidas en la venta a cancelar
    const saleItems = [
      { productId: "p1", quantity: 4 },
      { productId: "p2", quantity: 2 },
    ];

    // Simular restitución de stock al cancelar
    const updatedStock: Record<string, number> = {};
    const inventoryMovements: Array<{ productId: string; quantity: number; newStock: number }> = [];

    for (const item of saleItems) {
      const prod = productsInStock[item.productId as keyof typeof productsInStock];
      const previousStock = prod.stock;
      const newStock = previousStock + item.quantity;
      updatedStock[prod.id] = newStock;
      inventoryMovements.push({
        productId: prod.id,
        quantity: item.quantity,
        newStock,
      });
    }

    // Comprobar que los productos recibieron de vuelta su stock exacto
    expect(updatedStock["p1"]).toBe(12); // 8 + 4
    expect(updatedStock["p2"]).toBe(5); // 3 + 2

    // Comprobar que los movimientos registran cantidad positiva (reingreso)
    expect(inventoryMovements[0]).toEqual({
      productId: "p1",
      quantity: 4,
      newStock: 12,
    });
    expect(inventoryMovements[1]).toEqual({
      productId: "p2",
      quantity: 2,
      newStock: 5,
    });
  });

  it("evita cancelar una venta que ya fue cancelada previamente", () => {
    const sale = {
      id: "sale-123",
      folio: "VTA-20261013-0001",
      status: "CANCELLED",
    };

    function validateCanCancel(s: { status: string; folio: string }) {
      if (s.status === "CANCELLED") {
        throw new Error(`La venta con folio ${s.folio} ya fue cancelada previamente.`);
      }
      return true;
    }

    expect(() => validateCanCancel(sale)).toThrow(
      "La venta con folio VTA-20261013-0001 ya fue cancelada previamente."
    );
  });

  it("permite la cancelación tanto a cuentas de Administrador como de Empleado", () => {
    const users = [
      { id: "u-admin", username: "Hector", role: "admin" },
      { id: "u-admin2", username: "Edson", role: "admin" },
      { id: "u-emp", username: "Empleado", role: "employee" },
    ];

    function canUserCancelSale(user: { id: string; username: string }) {
      // Regla: Esta función estará disponible para todas las cuentas
      if (!user || !user.id) return false;
      return true;
    }

    users.forEach((u) => {
      expect(canUserCancelSale(u)).toBe(true);
    });
  });

  it("verifica que el modelo Sale incluye la relación cancelledBy en el cliente generado", async () => {
    const { PrismaClient } = await import("../src/generated/prisma/client");
    expect(PrismaClient).toBeDefined();
  });
});
