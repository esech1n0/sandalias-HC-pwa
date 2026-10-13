import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { roundMoney, formatCurrency } from "../src/lib/money";

// Mock de prisma para pruebas unitarias de getCashCutPdfData y generateDailySalesPdf
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    cashRegister: {
      findUnique: vi.fn(),
    },
    sale: {
      findMany: vi.fn(),
    },
  },
}));

// Mock server-only para entorno de pruebas en vitest
vi.mock("server-only", () => ({}));

import { prisma } from "../src/lib/prisma";
import { getCashCutPdfData, generateDailySalesPdf } from "../src/services/pdfReport";

describe("Generación y Consolidación de Reporte Diario de Ventas en PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Consolidación y Reglas de Negocio en getCashCutPdfData", () => {
    it("consolida artículos vendidos del mismo precio, separa precios distintos y totaliza métodos de pago", async () => {
      const mockRegister = {
        id: "corte_123456",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T20:00:00Z"),
        openingBalance: 1000,
        cashSales: 650,
        cardSales: 450,
        transferSales: 200,
        withdrawalsTotal: 300,
        expectedCash: 1350,
        countedCash: 1350,
        difference: 0,
        notes: "Corte sin incidencias",
        openedBy: { name: "Cajero 1", username: "cajero1" },
        closedBy: { name: "Cajero 1", username: "cajero1" },
      };

      // Tres ventas: una en efectivo, una con tarjeta, una con transferencia
      // Venta 1: 2 Sandalias a $150 ($300) y 1 Pantufla a $100 ($100). Total: $400 Efectivo
      // Venta 2: 1 Sandalia a $150 ($150) y 3 Pantuflas a $100 ($300). Total: $450 Tarjeta
      // Venta 3: 1 Sandalia a precio especial $120 ($120) y 1 Pantufla a $80 ($80). Total: $200 Transferencia
      // Venta 4: CANCELADA (no debe ser retornada por prisma porque el query filtra COMPLETED)
      const mockSales = [
        {
          id: "sale_1",
          folio: "VTA-20261013-0001",
          subtotal: 400,
          discountAmount: 0,
          total: 400,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T10:00:00Z"),
          cashRegisterId: "corte_123456",
          items: [
            {
              id: "item_1",
              productName: "Sandalias Dama",
              quantity: 2,
              unitPrice: 150,
              subtotal: 300,
            },
            {
              id: "item_2",
              productName: "Pantuflas Confort",
              quantity: 1,
              unitPrice: 100,
              subtotal: 100,
            },
          ],
          payments: [{ method: "CASH", amount: 400 }],
        },
        {
          id: "sale_2",
          folio: "VTA-20261013-0002",
          subtotal: 450,
          discountAmount: 0,
          total: 450,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T12:00:00Z"),
          cashRegisterId: "corte_123456",
          items: [
            {
              id: "item_3",
              productName: "Sandalias Dama",
              quantity: 1,
              unitPrice: 150,
              subtotal: 150,
            },
            {
              id: "item_4",
              productName: "Pantuflas Confort",
              quantity: 3,
              unitPrice: 100,
              subtotal: 300,
            },
          ],
          payments: [{ method: "CARD", amount: 450 }],
        },
        {
          id: "sale_3",
          folio: "VTA-20261013-0003",
          subtotal: 200,
          discountAmount: 0,
          total: 200,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T15:00:00Z"),
          cashRegisterId: "corte_123456",
          items: [
            {
              id: "item_5",
              productName: "Sandalias Dama",
              quantity: 1,
              unitPrice: 120, // Precio diferenciado / promoción
              subtotal: 120,
            },
            {
              id: "item_6",
              productName: "Pantuflas Confort",
              quantity: 1,
              unitPrice: 80,
              subtotal: 80,
            },
          ],
          payments: [
            { method: "TRANSFER", amount: 200 },
          ],
        },
      ];

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const result = await getCashCutPdfData("corte_123456");

      // 1. Verificación del corte
      expect(result.register.id).toBe("corte_123456");
      expect(result.register.openedByName).toBe("Cajero 1");

      // 2. Verificación de totales de pago
      expect(result.salesSummary.totalCash).toBe(400);
      expect(result.salesSummary.totalCard).toBe(450);
      expect(result.salesSummary.totalTransfer).toBe(200);
      expect(result.salesSummary.totalSales).toBe(1050); // 400 + 450 + 200
      expect(result.salesSummary.salesCount).toBe(3);

      // 3. Verificación de consolidación de artículos
      // Sandalias Dama a $150: 2 (sale 1) + 1 (sale 2) = 3 unidades, $450
      // Sandalias Dama a $120: 1 (sale 3) = 1 unidad, $120 (separada para no perder precisión)
      // Pantuflas Confort a $100: 1 (sale 1) + 3 (sale 2) = 4 unidades, $400
      // Pantuflas Confort a $80: 1 (sale 3) = 1 unidad, $80
      const items = result.salesSummary.items;
      expect(items).toHaveLength(4);

      const pantuflas100 = items.find((i) => i.productName === "Pantuflas Confort" && i.unitPrice === 100);
      expect(pantuflas100).toBeDefined();
      expect(pantuflas100?.quantity).toBe(4);
      expect(pantuflas100?.totalAmount).toBe(400);

      const pantuflas80 = items.find((i) => i.productName === "Pantuflas Confort" && i.unitPrice === 80);
      expect(pantuflas80).toBeDefined();
      expect(pantuflas80?.quantity).toBe(1);
      expect(pantuflas80?.totalAmount).toBe(80);

      const sandalias150 = items.find((i) => i.productName === "Sandalias Dama" && i.unitPrice === 150);
      expect(sandalias150).toBeDefined();
      expect(sandalias150?.quantity).toBe(3);
      expect(sandalias150?.totalAmount).toBe(450);

      const sandalias120 = items.find((i) => i.productName === "Sandalias Dama" && i.unitPrice === 120);
      expect(sandalias120).toBeDefined();
      expect(sandalias120?.quantity).toBe(1);
      expect(sandalias120?.totalAmount).toBe(120);

      // Total de piezas
      expect(result.salesSummary.totalUnits).toBe(4 + 1 + 3 + 1); // 9 piezas
    });

    it("filtra únicamente ventas COMPLETED y no incluye canceladas", async () => {
      (prisma.cashRegister.findUnique as any).mockResolvedValue({
        id: "corte_test",
        openedAt: new Date("2026-10-13T08:00:00Z"),
        closedAt: new Date("2026-10-13T18:00:00Z"),
        openingBalance: 500,
        cashSales: 0,
        cardSales: 0,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 500,
        countedCash: 500,
        difference: 0,
        notes: null,
      });

      (prisma.sale.findMany as any).mockResolvedValue([]);

      await getCashCutPdfData("corte_test");

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "COMPLETED",
          }),
        })
      );
    });
  });

  describe("Generación del Documento PDF Completo", () => {
    it("genera el archivo binario PDF válido con nombre de archivo descriptivo", async () => {
      (prisma.cashRegister.findUnique as any).mockResolvedValue({
        id: "corte_999888",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T21:00:00Z"),
        openingBalance: 1000,
        cashSales: 300,
        cardSales: 150,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 1300,
        countedCash: 1300,
        difference: 0,
        notes: "Excelente día de ventas",
        openedBy: { name: "Edson", username: "admin" },
        closedBy: { name: "Edson", username: "admin" },
      });

      (prisma.sale.findMany as any).mockResolvedValue([
        {
          id: "sale_abc",
          folio: "VTA-20261013-0001",
          subtotal: 450,
          discountAmount: 0,
          total: 450,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T11:00:00Z"),
          cashRegisterId: "corte_999888",
          items: [
            {
              id: "item_x",
              productName: "Sandalias de Playa",
              quantity: 3,
              unitPrice: 150,
              subtotal: 450,
            },
          ],
          payments: [
            { method: "CASH", amount: 300 },
            { method: "CARD", amount: 150 },
          ],
        },
      ]);

      const result = await generateDailySalesPdf("corte_999888");

      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(1000); // Un PDF real con estilos mide varios KB
      expect(result.filename).toMatch(/^Reporte_Ventas_\d{4}-\d{2}-\d{2}\.pdf$/);

      // Verificamos que contenga la cabecera PDF (%PDF-)
      const pdfHeader = result.buffer.toString("utf8", 0, 5);
      expect(pdfHeader).toBe("%PDF-");
    });

    it("genera el reporte múltiples veces sin duplicar ni modificar datos", async () => {
      const mockRegister = {
        id: "corte_inmutable",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T20:00:00Z"),
        openingBalance: 800,
        cashSales: 200,
        cardSales: 0,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 1000,
        countedCash: 1000,
        difference: 0,
        notes: null,
      };

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue([]);

      const run1 = await generateDailySalesPdf("corte_inmutable");
      const run2 = await generateDailySalesPdf("corte_inmutable");

      // Las dos ejecuciones deben producir datos idénticos
      expect(run1.data.salesSummary.totalSales).toBe(run2.data.salesSummary.totalSales);
      expect(run1.data.register.id).toBe(run2.data.register.id);
      expect(run1.filename).toBe(run2.filename);
    });
  });
});
