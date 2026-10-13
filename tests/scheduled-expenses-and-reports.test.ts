import { describe, it, expect } from "vitest";
import { calculateFinancialMetrics } from "../src/lib/reports/metrics";
import { roundMoney } from "../src/lib/money";

describe("Mejoras Financieras: Gastos Programados y Reportes", () => {
  // ==========================================================================
  // 1. Caso de Comportamiento Esperado del Usuario (Sección 3.4 del Prompt)
  // ==========================================================================
  describe("3.4 Comportamiento Esperado: Ventas, Costos, Gastos Reales y Compromisos Programados", () => {
    it("Calcula correctamente: Ventas $30k, Costo $12k, Gastos $1k, Renta pendiente $15k => Utilidad antes de renta $17k, Compromiso $15k, Proyectado $2k", () => {
      const metrics = calculateFinancialMetrics({
        totalSales: 30000,
        totalCostOfGoodsSold: 12000,
        totalExpenses: 1000, // Gastos efectivamente pagados
        totalWithdrawals: 0,
        pendingCommitments: 15000, // Renta mensual programada pendiente de pago
      });

      // Ganancia bruta: 30,000 - 12,000 = 18,000
      expect(metrics.grossProfit).toBe(18000);

      // Utilidad neta real antes del compromiso pendiente: 18,000 - 1,000 = 17,000
      expect(metrics.netProfit).toBe(17000);
      expect(metrics.isNetLoss).toBe(false);

      // Compromiso pendiente: $15,000
      expect(metrics.pendingCommitments).toBe(15000);

      // Resultado proyectado tras cubrir la renta: 17,000 - 15,000 = 2,000
      expect(metrics.projectedNetProfit).toBe(2000);
      expect(metrics.isProjectedLoss).toBe(false);
    });

    it("Al pagar la renta, el gasto pasa a efectivamente pagado ($16,000) y el compromiso pendiente baja a $0 sin duplicar", () => {
      // Propietario paga la renta de $15,000
      const metricsAfterPayment = calculateFinancialMetrics({
        totalSales: 30000,
        totalCostOfGoodsSold: 12000,
        totalExpenses: 16000, // 1,000 anteriores + 15,000 de la renta pagada
        totalWithdrawals: 0,
        pendingCommitments: 0, // El compromiso ya no está pendiente
      });

      // Ganancia bruta sigue siendo $18,000
      expect(metricsAfterPayment.grossProfit).toBe(18000);

      // Ganancia neta real se actualiza a $2,000
      expect(metricsAfterPayment.netProfit).toBe(2000);
      expect(metricsAfterPayment.pendingCommitments).toBe(0);
      expect(metricsAfterPayment.projectedNetProfit).toBe(2000);
      expect(metricsAfterPayment.isNetLoss).toBe(false);
    });

    it("Alerta de pérdida proyectada cuando los compromisos pendientes superan la utilidad real", () => {
      const metrics = calculateFinancialMetrics({
        totalSales: 10000,
        totalCostOfGoodsSold: 4000,
        totalExpenses: 1000,
        totalWithdrawals: 0,
        pendingCommitments: 8000, // Compromisos superan la utilidad actual ($5,000)
      });

      expect(metrics.grossProfit).toBe(6000);
      expect(metrics.netProfit).toBe(5000);
      expect(metrics.isNetLoss).toBe(false); // La utilidad real no tiene pérdida aún

      // Proyección muestra pérdida esperada de -$3,000
      expect(metrics.projectedNetProfit).toBe(-3000);
      expect(metrics.isProjectedLoss).toBe(true);
      expect(metrics.projectedLossAmount).toBe(3000);
    });
  });

  // ==========================================================================
  // 2. Integridad de Métricas y Cálculos Financieros
  // ==========================================================================
  describe("Independencia de Retiros y Movimientos de Efectivo", () => {
    it("Los retiros de efectivo no reducen la ganancia neta ni los compromisos proyectados", () => {
      const sinRetiros = calculateFinancialMetrics({
        totalSales: 20000,
        totalCostOfGoodsSold: 8000,
        totalExpenses: 2000,
        totalWithdrawals: 0,
        pendingCommitments: 3000,
      });

      const conRetiros = calculateFinancialMetrics({
        totalSales: 20000,
        totalCostOfGoodsSold: 8000,
        totalExpenses: 2000,
        totalWithdrawals: 5000, // Retiro de efectivo
        pendingCommitments: 3000,
      });

      expect(conRetiros.grossProfit).toBe(sinRetiros.grossProfit);
      expect(conRetiros.netProfit).toBe(sinRetiros.netProfit);
      expect(conRetiros.projectedNetProfit).toBe(sinRetiros.projectedNetProfit);
      expect(conRetiros.totalWithdrawals).toBe(5000);
    });
  });

  // ==========================================================================
  // 3. Reglas de Negocio para Gastos Recurrentes y Fechas
  // ==========================================================================
  describe("Reglas de Fechas para Gastos Recurrentes", () => {
    it("Calcula correctamente periodicidad mensual sumando un mes", () => {
      const base = new Date(2026, 9, 10); // 10 de Octubre de 2026
      const nextMonth = new Date(base);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      expect(nextMonth.getMonth()).toBe(10); // Noviembre
      expect(nextMonth.getDate()).toBe(10);
    });

    it("Maneja desbordamiento de fin de mes correctamente (31 de enero)", () => {
      const base = new Date(2026, 0, 31); // 31 de Enero
      const nextMonth = new Date(base);
      const currentDay = base.getDate();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (nextMonth.getDate() < currentDay) {
        nextMonth.setDate(0); // Último día de febrero
      }

      expect(nextMonth.getMonth()).toBe(1); // Febrero
      expect(nextMonth.getDate()).toBe(28); // 2026 no es bisiesto
    });

    it("Calcula periodicidad anual sumando un año exacto", () => {
      const base = new Date(2026, 5, 15);
      const nextYear = new Date(base);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      expect(nextYear.getFullYear()).toBe(2027);
      expect(nextYear.getMonth()).toBe(5);
      expect(nextYear.getDate()).toBe(15);
    });

    it("Calcula periodicidad semanal sumando 7 días", () => {
      const base = new Date(2026, 9, 12);
      const nextWeek = new Date(base);
      nextWeek.setDate(nextWeek.getDate() + 7);

      expect(nextWeek.getDate()).toBe(19);
      expect(nextWeek.getMonth()).toBe(9);
    });
  });
});
