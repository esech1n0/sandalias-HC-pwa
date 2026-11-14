import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  businessDateISO,
  businessDateKey,
  businessTimeToDate,
  endOfBusinessDay,
  getBusinessParts,
  startOfBusinessDay,
} from "../src/lib/dates";
import { formatNextFolio } from "../src/lib/db/locks";
import {
  createSaleSchema,
  moneySchema,
  parseInput,
  positiveMoneySchema,
  stockSchema,
} from "../src/lib/validation";

// México (America/Mexico_City) es UTC-6 todo el año desde 2022.
describe("Fechas en hora de México", () => {
  it("una venta a las 19:00 hora México (01:00 UTC del día siguiente) cuenta para el día local", () => {
    const sale = new Date("2026-11-14T01:00:00.000Z"); // 13 nov 19:00 en CDMX
    expect(businessDateISO(sale)).toBe("2026-11-13");
    expect(businessDateKey(sale)).toBe("20261113");
  });

  it("inicio y fin del día del negocio son 06:00Z y 05:59:59.999Z del día siguiente", () => {
    const d = new Date("2026-11-13T20:00:00.000Z");
    expect(startOfBusinessDay(d).toISOString()).toBe("2026-11-13T06:00:00.000Z");
    expect(endOfBusinessDay(d).toISOString()).toBe("2026-11-14T05:59:59.999Z");
  });

  it("convierte hora local de México a UTC y acepta desbordes de mes", () => {
    expect(businessTimeToDate(2026, 0, 1).toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(businessTimeToDate(2026, 12, 1).toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });

  it("reporta el día de la semana local (lunes = 1)", () => {
    // 16 nov 2026 es lunes; a las 23:00 CDMX ya es martes en UTC
    expect(getBusinessParts(new Date("2026-11-17T05:00:00.000Z")).weekday).toBe(1);
  });
});

describe("Folios correlativos", () => {
  it("empieza en 0001 y continúa desde el último folio del día", () => {
    expect(formatNextFolio("VTA-20261113-", null)).toBe("VTA-20261113-0001");
    expect(formatNextFolio("VTA-20261113-", "VTA-20261113-0041")).toBe("VTA-20261113-0042");
  });
});

describe("Validación de entradas", () => {
  it("rechaza NaN, negativos y cantidades decimales", () => {
    expect(() => parseInput(moneySchema, NaN)).toThrow("Monto inválido.");
    expect(() => parseInput(moneySchema, -5)).toThrow("no puede ser negativo");
    expect(() => parseInput(positiveMoneySchema, 0)).toThrow("mayor a cero");
    expect(() => parseInput(stockSchema, 2.5)).toThrow("entero");
  });

  it("acepta una venta válida y rechaza cantidades decimales o métodos de pago inventados", () => {
    const valid = {
      items: [{ productId: "p1", name: "Sandalia", originalPrice: 300, unitCost: 120, quantity: 2 }],
      payments: [{ method: "CASH", amount: 600, receivedAmount: 1000 }],
      cartDiscount: null,
    };
    expect(parseInput(createSaleSchema, valid).items).toHaveLength(1);

    expect(() =>
      parseInput(createSaleSchema, {
        ...valid,
        items: [{ ...valid.items[0], quantity: 0.5 }],
      })
    ).toThrow("entero");

    expect(() =>
      parseInput(createSaleSchema, {
        ...valid,
        payments: [{ method: "CRYPTO", amount: 600 }],
      })
    ).toThrow("Método de pago inválido.");
  });
});
