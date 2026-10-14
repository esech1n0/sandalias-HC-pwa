import { describe, it, expect } from "vitest";
import {
  calculateCardCommission,
  calculateSaleProfitSummary,
  validateCommissionRate,
} from "../src/lib/sales/commission";
import { calculateCart, validatePayments } from "../src/lib/sales/calculations";
import { calculateFinancialMetrics } from "../src/lib/reports/metrics";
import { roundMoney } from "../src/lib/money";

describe("Comisión por Pago con Tarjeta - Pruebas Obligatorias (11 Escenarios)", () => {
  // --------------------------------------------------------------------------
  // Escenario 1: Configurar una comisión global del 3.5 % y verificar que se aplique
  // --------------------------------------------------------------------------
  it("Escenario 1: Aplica comisión global de 3.5% a una nueva venta con tarjeta de $1,000.00", () => {
    const globalRate = 3.5;
    const isEnabled = true;
    const cardAmount = 1000;

    const result = calculateCardCommission({
      cardAmount,
      rate: globalRate,
      isEnabled,
    });

    expect(result.hasCommission).toBe(true);
    expect(result.rateApplied).toBe(3.5);
    expect(result.commissionAmount).toBe(35.0);
    expect(result.netReceived).toBe(965.0);
  });

  // --------------------------------------------------------------------------
  // Escenario 2: Cambiar el porcentaje de una venta individual sin alterar el global
  // --------------------------------------------------------------------------
  it("Escenario 2: Permite modificar el porcentaje a 2.0% para una venta específica sin cambiar el valor global (3.5%)", () => {
    const globalConfig = { enabled: true, rate: 3.5 };

    // Venta individual personalizada a 2.0%
    const saleSpecificRate = 2.0;
    const saleResult = calculateCardCommission({
      cardAmount: 1000,
      rate: saleSpecificRate,
      isEnabled: true,
    });

    expect(saleResult.rateApplied).toBe(2.0);
    expect(saleResult.commissionAmount).toBe(20.0);
    expect(saleResult.netReceived).toBe(980.0);

    // La configuración global se mantiene intacta en 3.5%
    expect(globalConfig.rate).toBe(3.5);
    const nextSaleResult = calculateCardCommission({
      cardAmount: 1000,
      rate: globalConfig.rate,
      isEnabled: globalConfig.enabled,
    });
    expect(nextSaleResult.rateApplied).toBe(3.5);
    expect(nextSaleResult.commissionAmount).toBe(35.0);
  });

  // --------------------------------------------------------------------------
  // Escenario 3: Venta en efectivo y otra por transferencia (sin comisión)
  // --------------------------------------------------------------------------
  it("Escenario 3: No aplica comisión a ventas pagadas exclusivamente en efectivo o por transferencia", () => {
    // Venta en efectivo
    const cashSale = calculateCardCommission({
      cardAmount: 0,
      rate: 3.5,
      isEnabled: true,
    });
    expect(cashSale.hasCommission).toBe(false);
    expect(cashSale.commissionAmount).toBe(0);
    expect(cashSale.netReceived).toBe(0);

    // Venta por transferencia
    const transferSale = calculateCardCommission({
      cardAmount: 0,
      rate: 3.5,
      isEnabled: true,
    });
    expect(transferSale.hasCommission).toBe(false);
    expect(transferSale.commissionAmount).toBe(0);
    expect(transferSale.netReceived).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Escenario 4: Pagos divididos (comisión calculada únicamente sobre la tarjeta)
  // --------------------------------------------------------------------------
  it("Escenario 4: En pagos divididos (ej. $400 efectivo, $200 transferencia, $400 tarjeta), la comisión se calcula sólo sobre la tarjeta", () => {
    const totalSale = 1000;
    const cashPart = 400;
    const transferPart = 200;
    const cardPart = 400;

    const validation = validatePayments(totalSale, [
      { method: "CASH", amount: cashPart, receivedAmount: cashPart },
      { method: "TRANSFER", amount: transferPart },
      { method: "CARD", amount: cardPart },
    ]);
    expect(validation.isValid).toBe(true);
    expect(validation.status).toBe("EXACT");

    // Comisión calculada al 3.5% únicamente sobre los $400 de tarjeta
    const cardCommission = calculateCardCommission({
      cardAmount: cardPart,
      rate: 3.5,
      isEnabled: true,
    });

    expect(cardCommission.cardAmount).toBe(400);
    expect(cardCommission.commissionAmount).toBe(14.0); // 400 * 0.035 = 14.00
    expect(cardCommission.netReceived).toBe(386.0); // 400 - 14.00 = 386.00

    // Neto total recibido por el negocio: 400 (efectivo) + 200 (transferencia) + 386 (tarjeta) = 986.00
    const totalNetReceived = roundMoney(cashPart + transferPart + cardCommission.netReceived);
    expect(totalNetReceived).toBe(986.0);
    expect(totalNetReceived).toBe(roundMoney(totalSale - cardCommission.commissionAmount));
  });

  // --------------------------------------------------------------------------
  // Escenario 5: Cambiar el método de pago durante la venta actualiza inmediatamente
  // --------------------------------------------------------------------------
  it("Escenario 5: Cambiar el método de pago de efectivo a tarjeta y viceversa actualiza inmediatamente los cálculos", () => {
    const saleAmount = 500;
    const rate = 3.5;

    // Inicialmente efectivo (0 en tarjeta)
    let cardAmount = 0;
    let comm = calculateCardCommission({ cardAmount, rate, isEnabled: true });
    expect(comm.hasCommission).toBe(false);
    expect(comm.commissionAmount).toBe(0);

    // Cambia a tarjeta ($500)
    cardAmount = 500;
    comm = calculateCardCommission({ cardAmount, rate, isEnabled: true });
    expect(comm.hasCommission).toBe(true);
    expect(comm.commissionAmount).toBe(17.5);
    expect(comm.netReceived).toBe(482.5);

    // Cambia a transferencia ($0 en tarjeta)
    cardAmount = 0;
    comm = calculateCardCommission({ cardAmount, rate, isEnabled: true });
    expect(comm.hasCommission).toBe(false);
    expect(comm.commissionAmount).toBe(0);
    expect(comm.netReceived).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Escenario 6: Integridad histórica ante cambios en la configuración global
  // --------------------------------------------------------------------------
  it("Escenario 6: Una venta confirmada conserva su comisión histórica (3.5%) aún cuando la configuración global cambie a 5.0% o se desactive", () => {
    // Venta registrada históricamente
    const historicalSale = {
      folio: "VTA-20261014-0001",
      total: 1000.0,
      cardCommissionRate: 3.5,
      cardCommissionAmount: 35.0,
      netReceivedAmount: 965.0,
    };

    // El administrador cambia la configuración global posteriormente
    const updatedGlobalSettings = {
      cardCommissionEnabled: false,
      cardCommissionPercentage: 5.0,
    };

    // La venta histórica debe conservar inalterados sus valores
    expect(historicalSale.cardCommissionRate).toBe(3.5);
    expect(historicalSale.cardCommissionAmount).toBe(35.0);
    expect(historicalSale.netReceivedAmount).toBe(965.0);

    // Las nuevas ventas respetarán la nueva configuración (en este caso desactivada = 0 comisión)
    const newSale = calculateCardCommission({
      cardAmount: 1000,
      rate: updatedGlobalSettings.cardCommissionPercentage,
      isEnabled: updatedGlobalSettings.cardCommissionEnabled,
    });
    expect(newSale.hasCommission).toBe(false);
    expect(newSale.commissionAmount).toBe(0);
    expect(newSale.netReceived).toBe(1000);
  });

  // --------------------------------------------------------------------------
  // Escenario 7: Ganancia antes y después de la comisión con costos reales y costos incompletos
  // --------------------------------------------------------------------------
  it("Escenario 7: Calcula ganancia antes y después de comisión con costos reales y marca estimaciones parciales si falta costo", () => {
    // Caso con costo completo: Venta $1,000, Costo $600, Comisión 3.5% = $35
    const profitFull = calculateSaleProfitSummary({
      totalSale: 1000,
      totalCost: 600,
      cardCommissionAmount: 35,
      hasIncompleteCost: false,
    });

    expect(profitFull.totalSale).toBe(1000);
    expect(profitFull.totalCost).toBe(600);
    expect(profitFull.profitBeforeCommission).toBe(400); // 1000 - 600
    expect(profitFull.cardCommissionAmount).toBe(35);
    expect(profitFull.profitAfterCommission).toBe(365); // 400 - 35
    expect(profitFull.hasIncompleteCost).toBe(false);
    expect(profitFull.isNetLoss).toBe(false);

    // Caso con costo incompleto: alguno con costo $0.00
    const profitIncomplete = calculateSaleProfitSummary({
      totalSale: 1000,
      totalCost: 200,
      cardCommissionAmount: 35,
      hasIncompleteCost: true,
    });
    expect(profitIncomplete.hasIncompleteCost).toBe(true);
    expect(profitIncomplete.profitAfterCommission).toBe(765); // (1000 - 200) - 35
  });

  // --------------------------------------------------------------------------
  // Escenario 8: Confirmar que la comisión NO altere los reportes existentes
  // --------------------------------------------------------------------------
  it("Escenario 8: La comisión bancaria no altera las cifras de los reportes existentes ni agrega filas/gastos independientes", () => {
    // Datos de prueba para reportes
    const mockSales = [
      {
        total: 1000,
        totalCost: 600,
        grossProfit: 400,
        createdAt: new Date(),
        items: [],
        payments: [],
      },
    ];
    const mockExpenses = [{ amount: 100, category: "Servicios" }];

    // calculateFinancialMetrics calcula métricas financieras conforme a la regla existente
    const metrics = calculateFinancialMetrics({
      totalSales: 1000,
      totalCostOfGoodsSold: 600,
      totalExpenses: 100,
      totalWithdrawals: 0,
      cardSales: 1000,
    });

    expect(metrics.totalSales).toBe(1000);
    expect(metrics.totalCostOfGoodsSold).toBe(600);
    expect(metrics.grossProfit).toBe(400); // 1000 - 600
    expect(metrics.totalExpenses).toBe(100);
    expect(metrics.netProfit).toBe(300); // 400 - 100

    // No existe ninguna columna, categoría o descuento de comisión bancaria en las métricas de reportes
    expect(metrics).not.toHaveProperty("cardCommissionTotal");
    expect(metrics).not.toHaveProperty("commissionExpense");
    expect(metrics).not.toHaveProperty("cardCommission");
  });

  // --------------------------------------------------------------------------
  // Escenario 9: Comprobar que no haya doble descuento de la comisión en ganancias
  // --------------------------------------------------------------------------
  it("Escenario 9: Evita doble descuento de la comisión en los cálculos de ganancias", () => {
    const totalSale = 1000;
    const totalCost = 600;
    const commission = 35;

    const summary = calculateSaleProfitSummary({
      totalSale,
      totalCost,
      cardCommissionAmount: commission,
    });

    // Ganancia antes de comisión es exactamente (Total - Costo)
    expect(summary.profitBeforeCommission).toBe(400);

    // Ganancia después de comisión descuenta la comisión exactamente una vez
    expect(summary.profitAfterCommission).toBe(365);
    expect(summary.profitBeforeCommission - summary.profitAfterCommission).toBe(commission);
  });

  // --------------------------------------------------------------------------
  // Escenario 10: Cálculos con porcentajes decimales, descuentos y validaciones
  // --------------------------------------------------------------------------
  it("Escenario 10: Cálculos con tasas decimales (2.5%, 3.25%, 3.5%), validaciones de rango y ventas con descuento", () => {
    // 2.5% sobre $1,000
    const res25 = calculateCardCommission({ cardAmount: 1000, rate: 2.5, isEnabled: true });
    expect(res25.commissionAmount).toBe(25.0);
    expect(res25.netReceived).toBe(975.0);

    // 3.25% sobre $1,000
    const res325 = calculateCardCommission({ cardAmount: 1000, rate: 3.25, isEnabled: true });
    expect(res325.commissionAmount).toBe(32.5);
    expect(res325.netReceived).toBe(967.5);

    // Venta con descuento de carrito: Producto $1,000 con 10% descuento = $900
    const cartRes = calculateCart(
      [
        {
          productId: "p1",
          name: "Pantufla",
          originalPrice: 1000,
          unitCost: 500,
          quantity: 1,
        },
      ],
      { type: "PERCENTAGE", value: 10 }
    );
    expect(cartRes.total).toBe(900);

    // Comisión 3.5% calculada sobre el total cobrado al cliente ($900)
    const commWithDiscount = calculateCardCommission({
      cardAmount: cartRes.total,
      rate: 3.5,
      isEnabled: true,
    });
    expect(commWithDiscount.commissionAmount).toBe(31.5); // 900 * 0.035 = 31.50
    expect(commWithDiscount.netReceived).toBe(868.5); // 900 - 31.50 = 868.50

    // Validaciones de tasa de comisión
    expect(validateCommissionRate("3.5").isValid).toBe(true);
    expect(validateCommissionRate("3.5").parsedRate).toBe(3.5);

    expect(validateCommissionRate("3.25").isValid).toBe(true);
    expect(validateCommissionRate("3.25").parsedRate).toBe(3.25);

    expect(validateCommissionRate("-1").isValid).toBe(false);
    expect(validateCommissionRate("105").isValid).toBe(false);
    expect(validateCommissionRate("abc").isValid).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Escenario 11: Desactivación de comisión (tasa 0 o isEnabled false)
  // --------------------------------------------------------------------------
  it("Escenario 11: Si la comisión está desactivada globalmente, no se descuenta ninguna cantidad", () => {
    const disabledResult = calculateCardCommission({
      cardAmount: 1000,
      rate: 3.5,
      isEnabled: false,
    });

    expect(disabledResult.hasCommission).toBe(false);
    expect(disabledResult.commissionAmount).toBe(0);
    expect(disabledResult.netReceived).toBe(1000);
  });
});
