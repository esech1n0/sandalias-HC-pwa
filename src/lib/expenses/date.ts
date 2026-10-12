/**
 * Utilidades para manejo de fechas en Gastos del Negocio
 */

/**
 * Retorna la fecha local actual en formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un Date o string ISO/fecha a formato YYYY-MM-DD para <input type="date">
 */
export function dateToInputString(dateInput?: string | Date | null): string {
  if (!dateInput) return getTodayDateString();
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return getTodayDateString();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha para visualización en tablas o consultas (DD/MM/AAAA)
 */
export function formatDisplayDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const parts = dateInput.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX");
}

/**
 * Parsea la fecha ingresada por el usuario al registrar o actualizar un gasto.
 * - Si es YYYY-MM-DD del día de hoy, preserva la hora actual.
 * - Si es YYYY-MM-DD de otro día, fija las 12:00:00 (mediodía) para evitar desfases de huso horario en UTC.
 */
export function parseExpenseDate(dateInput?: Date | string | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }
  const trimmed = dateInput.trim();
  if (!trimmed) return new Date();

  // Si viene en formato YYYY-MM-DD (del selector <input type="date">)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const now = new Date();
    // Si la fecha seleccionada corresponde a hoy, conservamos hora/minutos/segundos
    if (
      now.getFullYear() === year &&
      now.getMonth() + 1 === month &&
      now.getDate() === day
    ) {
      return now;
    }
    // Para otra fecha seleccionada, fijamos el mediodía (12:00:00) local
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
