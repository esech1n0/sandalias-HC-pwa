import { describe, it, expect } from "vitest";
import {
  parseExpenseDate,
  getTodayDateString,
  dateToInputString,
  formatDisplayDate,
} from "../src/lib/expenses/date";

describe("Gastos - Selector y parseo de fechas", () => {
  it("getTodayDateString debe retornar la fecha de hoy en formato YYYY-MM-DD", () => {
    const todayStr = getTodayDateString();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const now = new Date();
    const parts = todayStr.split("-").map(Number);
    expect(parts[0]).toBe(now.getFullYear());
    expect(parts[1]).toBe(now.getMonth() + 1);
    expect(parts[2]).toBe(now.getDate());
  });

  it("dateToInputString debe convertir correctamente fechas ISO o Dates a YYYY-MM-DD", () => {
    expect(dateToInputString("2026-10-11")).toBe("2026-10-11");
    expect(dateToInputString("2026-10-11T18:00:00.000Z")).toBe("2026-10-11");
    const d = new Date(2026, 9, 25);
    expect(dateToInputString(d)).toBe("2026-10-25");
  });

  it("formatDisplayDate debe mostrar DD/MM/AAAA", () => {
    expect(formatDisplayDate("2026-10-09")).toBe("09/10/2026");
    expect(formatDisplayDate("")).toBe("—");
    expect(formatDisplayDate(null)).toBe("—");
  });

  it("parseExpenseDate debe retornar la fecha actual si no se proporciona fecha", () => {
    const parsed = parseExpenseDate();
    expect(parsed).toBeInstanceOf(Date);
    const now = new Date();
    expect(parsed.getFullYear()).toBe(now.getFullYear());
    expect(parsed.getMonth()).toBe(now.getMonth());
    expect(parsed.getDate()).toBe(now.getDate());
  });

  it("parseExpenseDate debe parsear correctamente una fecha en formato YYYY-MM-DD de otro día", () => {
    const parsed = parseExpenseDate("2026-05-18");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4); // Mayo (base 0)
    expect(parsed.getDate()).toBe(18);
    expect(parsed.getHours()).toBe(12); // Mediodía para evitar desfases de huso horario
  });

  it("parseExpenseDate debe mantener la hora actual si la fecha seleccionada es hoy", () => {
    const todayStr = getTodayDateString();
    const parsed = parseExpenseDate(todayStr);
    const now = new Date();
    expect(parsed.getFullYear()).toBe(now.getFullYear());
    expect(parsed.getMonth()).toBe(now.getMonth());
    expect(parsed.getDate()).toBe(now.getDate());
    expect(parsed.getHours()).toBe(now.getHours());
  });

  it("parseExpenseDate debe mantener el objeto Date si ya es una instancia de Date válida", () => {
    const inputDate = new Date(2026, 5, 15, 10, 30);
    const parsed = parseExpenseDate(inputDate);
    expect(parsed.getTime()).toBe(inputDate.getTime());
  });
});
