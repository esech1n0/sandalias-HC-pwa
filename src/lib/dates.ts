// ==============================================================================
// Fechas en la zona horaria del negocio (México)
// El servidor (Vercel) corre en UTC; sin esto, las ventas después de las 18:00
// hora local caerían en el día siguiente en reportes y folios.
// ==============================================================================

export const BUSINESS_TIME_ZONE = "America/Mexico_City";

interface ZonedParts {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = domingo
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Componentes de fecha/hora de un instante, vistos en la zona horaria del negocio. */
export function getBusinessParts(date: Date): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAYS[map.weekday] ?? 0,
  };
}

/** Diferencia (ms) entre la hora local del negocio y UTC en un instante dado. */
function offsetMs(date: Date): number {
  const p = getBusinessParts(date);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convierte una fecha/hora "de reloj" en México al instante UTC correspondiente.
 * Acepta desbordes (día 0, mes 12, etc.) igual que Date.UTC.
 */
export function businessTimeToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  const guess = Date.UTC(year, month, day, hour, minute, second, ms);
  let result = guess - offsetMs(new Date(guess));
  // Segunda pasada por si el desfase cambia entre el valor estimado y el real (horario de verano).
  result = guess - offsetMs(new Date(result));
  return new Date(result);
}

/** Inicio (00:00:00.000 hora México) del día del negocio que contiene `date`. */
export function startOfBusinessDay(date: Date = new Date()): Date {
  const p = getBusinessParts(date);
  return businessTimeToDate(p.year, p.month, p.day);
}

/** Fin (23:59:59.999 hora México) del día del negocio que contiene `date`. */
export function endOfBusinessDay(date: Date = new Date()): Date {
  const p = getBusinessParts(date);
  return new Date(businessTimeToDate(p.year, p.month, p.day + 1).getTime() - 1);
}

/** Fecha YYYY-MM-DD del día del negocio (para agrupar por día o para <input type="date">). */
export function businessDateISO(date: Date = new Date()): string {
  const p = getBusinessParts(date);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Clave YYYYMMDD del día del negocio (para folios). */
export function businessDateKey(date: Date = new Date()): string {
  const p = getBusinessParts(date);
  return `${p.year}${String(p.month + 1).padStart(2, "0")}${String(p.day).padStart(2, "0")}`;
}
