import { describe, it, expect, vi, beforeEach } from "vitest";

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

    it("agrupa productos por categorías reales de la base de datos y desglosa variantes con subtotales exactos", async () => {
      const mockRegister = {
        id: "corte_categorias_ejemplo",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T21:00:00Z"),
        openingBalance: 1500,
        cashSales: 10000,
        cardSales: 5000,
        transferSales: 1880,
        withdrawalsTotal: 500,
        expectedCash: 11000,
        countedCash: 11000,
        difference: 0,
        notes: null,
        openedBy: { name: "Edson", username: "edson" },
        closedBy: { name: "Edson", username: "edson" },
      };

      // Ventas con productos en categorías reales: Gorras, Pijamas, Pantuflas
      const mockSales = [
        {
          id: "sale_gorras_1",
          folio: "VTA-001",
          subtotal: 1450,
          discountAmount: 0,
          total: 1450,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T10:00:00Z"),
          cashRegisterId: "corte_categorias_ejemplo",
          items: [
            {
              id: "item_g1",
              productId: "prod_g1",
              productName: "Gorra El Mago",
              quantity: 2,
              unitPrice: 200,
              subtotal: 400,
              product: { name: "Gorra El Mago", category: { id: "cat_gorras", name: "Gorras" } },
            },
            {
              id: "item_g2",
              productId: "prod_g2",
              productName: "Gorra New Era negra",
              quantity: 3,
              unitPrice: 350,
              subtotal: 1050,
              product: { name: "Gorra New Era negra", category: { id: "cat_gorras", name: "Gorras" } },
            },
          ],
          payments: [{ method: "CASH", amount: 1450 }],
        },
        {
          id: "sale_gorras_2",
          folio: "VTA-002",
          subtotal: 940,
          discountAmount: 0,
          total: 940,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T11:00:00Z"),
          cashRegisterId: "corte_categorias_ejemplo",
          items: [
            {
              id: "item_g3",
              productId: "prod_g1", // Misma variante (Gorra El Mago a $200), debe acumular unidades a 4
              productName: "Gorra El Mago",
              quantity: 2,
              unitPrice: 200,
              subtotal: 400,
              product: { name: "Gorra El Mago", category: { id: "cat_gorras", name: "Gorras" } },
            },
            {
              id: "item_g4",
              productId: "prod_g3",
              productName: "Gorra de brillos",
              quantity: 3,
              unitPrice: 180,
              subtotal: 540,
              product: { name: "Gorra de brillos", category: { id: "cat_gorras", name: "Gorras" } },
            },
          ],
          payments: [{ method: "CARD", amount: 940 }],
        },
        {
          id: "sale_pijamas_1",
          folio: "VTA-003",
          subtotal: 7740,
          discountAmount: 0,
          total: 7740,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T13:00:00Z"),
          cashRegisterId: "corte_categorias_ejemplo",
          items: [
            {
              id: "item_p1",
              productId: "prod_p1",
              productName: "Pijama de Hello Kitty",
              quantity: 12,
              unitPrice: 250,
              subtotal: 3000,
              product: { name: "Pijama de Hello Kitty", category: { id: "cat_pijamas", name: "Pijamas" } },
            },
            {
              id: "item_p2",
              productId: "prod_p2",
              productName: "Pijama de Winnie Pooh",
              quantity: 10,
              unitPrice: 250,
              subtotal: 2500,
              product: { name: "Pijama de Winnie Pooh", category: { id: "cat_pijamas", name: "Pijamas" } },
            },
            {
              id: "item_p3",
              productId: "prod_p3",
              productName: "Pijama de Labubu",
              quantity: 8,
              unitPrice: 280,
              subtotal: 2240,
              product: { name: "Pijama de Labubu", category: { id: "cat_pijamas", name: "Pijamas" } },
            },
          ],
          payments: [
            { method: "CASH", amount: 5000 },
            { method: "CARD", amount: 2740 },
          ],
        },
        {
          id: "sale_pantuflas_1",
          folio: "VTA-004",
          subtotal: 6750,
          discountAmount: 0,
          total: 6750,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T16:00:00Z"),
          cashRegisterId: "corte_categorias_ejemplo",
          items: [
            {
              id: "item_pa1",
              productId: "prod_pa1",
              productName: "Pantufla de Hello Kitty",
              quantity: 20,
              unitPrice: 150,
              subtotal: 3000,
              product: { name: "Pantufla de Hello Kitty", category: { id: "cat_pantuflas", name: "Pantuflas" } },
            },
            {
              id: "item_pa2",
              productId: "prod_pa2",
              productName: "Pantufla de perrito",
              quantity: 15,
              unitPrice: 120,
              subtotal: 1800,
              product: { name: "Pantufla de perrito", category: { id: "cat_pantuflas", name: "Pantuflas" } },
            },
            {
              id: "item_pa3",
              productId: "prod_pa3",
              productName: "Pantufla de animalito",
              quantity: 15,
              unitPrice: 130,
              subtotal: 1950,
              product: { name: "Pantufla de animalito", category: { id: "cat_pantuflas", name: "Pantuflas" } },
            },
          ],
          payments: [
            { method: "CASH", amount: 3660 },
            { method: "CARD", amount: 1320 },
            { method: "TRANSFER", amount: 1770 },
          ],
        },
      ];

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const result = await generateDailySalesPdf("corte_categorias_ejemplo");
      const summary = result.data.salesSummary;

      // 1. Verificar que únicamente aparezcan las 3 categorías con ventas
      expect(summary.categories).toHaveLength(3);
      const catNames = summary.categories.map((c) => c.categoryName);
      expect(catNames).toEqual(["Gorras", "Pantuflas", "Pijamas"]);

      // 2. Verificar sección GORRAS
      const gorrasCat = summary.categories.find((c) => c.categoryName === "Gorras")!;
      expect(gorrasCat).toBeDefined();
      expect(gorrasCat.totalUnits).toBe(10); // 4 + 3 + 3
      expect(gorrasCat.subtotalAmount).toBe(2390); // 800 + 1050 + 540
      expect(gorrasCat.items).toHaveLength(3);

      const mago = gorrasCat.items.find((i) => i.productName === "Gorra El Mago")!;
      expect(mago.quantity).toBe(4); // 2 + 2 acumuladas de ambas ventas
      expect(mago.unitPrice).toBe(200);
      expect(mago.totalAmount).toBe(800);

      const newEra = gorrasCat.items.find((i) => i.productName === "Gorra New Era negra")!;
      expect(newEra.quantity).toBe(3);
      expect(newEra.unitPrice).toBe(350);
      expect(newEra.totalAmount).toBe(1050);

      const brillos = gorrasCat.items.find((i) => i.productName === "Gorra de brillos")!;
      expect(brillos.quantity).toBe(3);
      expect(brillos.unitPrice).toBe(180);
      expect(brillos.totalAmount).toBe(540);

      // 3. Verificar sección PIJAMAS
      const pijamasCat = summary.categories.find((c) => c.categoryName === "Pijamas")!;
      expect(pijamasCat).toBeDefined();
      expect(pijamasCat.totalUnits).toBe(30); // 12 + 10 + 8
      expect(pijamasCat.subtotalAmount).toBe(7740); // 3000 + 2500 + 2240

      // 4. Verificar sección PANTUFLAS
      const pantuflasCat = summary.categories.find((c) => c.categoryName === "Pantuflas")!;
      expect(pantuflasCat).toBeDefined();
      expect(pantuflasCat.totalUnits).toBe(50); // 20 + 15 + 15
      expect(pantuflasCat.subtotalAmount).toBe(6750); // 3000 + 1800 + 1950

      // 5. Total de unidades general y total monetario
      expect(summary.totalUnits).toBe(90); // 10 + 30 + 50
      expect(summary.itemsSubtotal).toBe(16880); // 2390 + 7740 + 6750
      expect(summary.totalSales).toBe(16880);

      // 6. Coincidencia estricta entre suma de subtotales por categoría y total general
      const sumSubtotals = summary.categories.reduce((acc, c) => acc + c.subtotalAmount, 0);
      expect(sumSubtotals).toBe(summary.totalSales);

      // 7. Coincidencia con métodos de pago
      const totalPayments = summary.totalCash + summary.totalCard + summary.totalTransfer;
      expect(totalPayments).toBe(summary.totalSales);

      // 8. Validación de buffer generado
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(1500);
    });

    it("separa en filas distintas una misma variante si fue vendida a precios diferentes o con descuentos", async () => {
      const mockRegister = {
        id: "corte_precios_diferentes",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T20:00:00Z"),
        openingBalance: 1000,
        cashSales: 740,
        cardSales: 0,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 1740,
        countedCash: 1740,
        difference: 0,
        notes: null,
      };

      const mockSales = [
        {
          id: "sale_regular",
          folio: "VTA-REG",
          subtotal: 400,
          discountAmount: 0,
          total: 400,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T10:00:00Z"),
          cashRegisterId: "corte_precios_diferentes",
          items: [
            {
              id: "i1",
              productId: "prod_mago",
              productName: "Gorra El Mago",
              quantity: 2,
              unitPrice: 200,
              subtotal: 400,
              product: { name: "Gorra El Mago", category: { id: "cat_g", name: "Gorras" } },
            },
          ],
          payments: [{ method: "CASH", amount: 400 }],
        },
        {
          id: "sale_descuento",
          folio: "VTA-DESC",
          subtotal: 340,
          discountAmount: 0,
          total: 340,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T11:00:00Z"),
          cashRegisterId: "corte_precios_diferentes",
          items: [
            {
              id: "i2",
              productId: "prod_mago",
              productName: "Gorra El Mago",
              quantity: 2,
              unitPrice: 170, // Precio con descuento o especial
              subtotal: 340,
              product: { name: "Gorra El Mago", category: { id: "cat_g", name: "Gorras" } },
            },
          ],
          payments: [{ method: "CASH", amount: 340 }],
        },
      ];

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const result = await generateDailySalesPdf("corte_precios_diferentes");
      const gorras = result.data.salesSummary.categories.find((c) => c.categoryName === "Gorras")!;

      // Deben existir 2 filas para "Gorra El Mago", una para $200 y otra para $170
      expect(gorras.items).toHaveLength(2);
      const regular = gorras.items.find((i) => i.unitPrice === 200)!;
      expect(regular.quantity).toBe(2);
      expect(regular.totalAmount).toBe(400);

      const discounted = gorras.items.find((i) => i.unitPrice === 170)!;
      expect(discounted.quantity).toBe(2);
      expect(discounted.totalAmount).toBe(340);

      // Subtotal de la categoría refleja ambas variantes
      expect(gorras.totalUnits).toBe(4);
      expect(gorras.subtotalAmount).toBe(740);
    });

    it("trata los descuentos globales explícitamente manteniendo coincidencia matemática exacta", async () => {
      const mockRegister = {
        id: "corte_descuento_global",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T20:00:00Z"),
        openingBalance: 1000,
        cashSales: 1350,
        cardSales: 0,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 2350,
        countedCash: 2350,
        difference: 0,
        notes: null,
      };

      // Venta con subtotal de artículos de $1,500 y descuento global de $150 -> Total cobrado $1,350
      const mockSales = [
        {
          id: "sale_ticket_discount",
          folio: "VTA-TICKET-DESC",
          subtotal: 1500,
          discountAmount: 150, // Descuento global en carrito
          total: 1350,
          status: "COMPLETED",
          createdAt: new Date("2026-10-13T12:00:00Z"),
          cashRegisterId: "corte_descuento_global",
          items: [
            {
              id: "item_t1",
              productId: "prod_t1",
              productName: "Sandalia Plataforma",
              quantity: 5,
              unitPrice: 300,
              subtotal: 1500,
              product: { name: "Sandalia Plataforma", category: { id: "cat_s", name: "Sandalias" } },
            },
          ],
          payments: [{ method: "CASH", amount: 1350 }],
        },
      ];

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue(mockSales);

      const result = await generateDailySalesPdf("corte_descuento_global");
      const summary = result.data.salesSummary;

      // Subtotal de artículos en categoría coincide con el total de artículos vendidos
      expect(summary.categories[0].subtotalAmount).toBe(1500);
      expect(summary.itemsSubtotal).toBe(1500);

      // Descuento global registrado explícitamente
      expect(summary.globalDiscounts).toBe(150);

      // Total general de ventas coincide con el cobro real y pagos
      expect(summary.totalSales).toBe(1350);
      expect(summary.totalCash).toBe(1350);
      expect(summary.itemsSubtotal - summary.globalDiscounts).toBe(summary.totalSales);
    });

    it("maneja correctamente múltiples categorías generando un PDF de varias páginas sin errores", async () => {
      const mockRegister = {
        id: "corte_muchas_categorias",
        openedAt: new Date("2026-10-13T09:00:00Z"),
        closedAt: new Date("2026-10-13T21:00:00Z"),
        openingBalance: 1000,
        cashSales: 15000,
        cardSales: 0,
        transferSales: 0,
        withdrawalsTotal: 0,
        expectedCash: 16000,
        countedCash: 16000,
        difference: 0,
        notes: null,
      };

      // Crear 7 categorías con varios artículos para asegurar que el PDF ocupe más de una página
      const categoryNames = [
        "Calcetas",
        "Gorras",
        "Otros",
        "Pantuflas",
        "Pijamas",
        "Ropa",
        "Sandalias",
      ];

      const salesList = categoryNames.map((catName, idx) => ({
        id: `sale_${idx}`,
        folio: `VTA-MULTI-${idx}`,
        subtotal: 1000,
        discountAmount: 0,
        total: 1000,
        status: "COMPLETED",
        createdAt: new Date("2026-10-13T10:00:00Z"),
        cashRegisterId: "corte_muchas_categorias",
        items: [
          {
            id: `item_${idx}_a`,
            productId: `prod_${idx}_a`,
            productName: `Producto A de ${catName}`,
            quantity: 2,
            unitPrice: 250,
            subtotal: 500,
            product: { name: `Producto A de ${catName}`, category: { id: `cat_${idx}`, name: catName } },
          },
          {
            id: `item_${idx}_b`,
            productId: `prod_${idx}_b`,
            productName: `Producto B de ${catName}`,
            quantity: 2,
            unitPrice: 250,
            subtotal: 500,
            product: { name: `Producto B de ${catName}`, category: { id: `cat_${idx}`, name: catName } },
          },
        ],
        payments: [{ method: "CASH", amount: 1000 }],
      }));

      (prisma.cashRegister.findUnique as any).mockResolvedValue(mockRegister);
      (prisma.sale.findMany as any).mockResolvedValue(salesList);

      const result = await generateDailySalesPdf("corte_muchas_categorias");

      expect(result.data.salesSummary.categories).toHaveLength(7);
      expect(result.data.salesSummary.totalUnits).toBe(28); // 7 * 4
      expect(result.data.salesSummary.totalSales).toBe(7000); // 7 * 1000
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(2000);
    });
  });
});
