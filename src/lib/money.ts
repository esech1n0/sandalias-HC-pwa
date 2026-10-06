// ==============================================================================
// Utilidades de Dinero y Precisión Financiera (MXN)
// Evita errores de redondeo de punto flotante en cálculos críticos.
// ==============================================================================

/**
 * Convierte un número o string a número redondeado exactamente a 2 decimales.
 */
export function roundMoney(amount: number | string): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Formatea un monto a moneda mexicana (MXN).
 * Ejemplo: $300.00, $1,250.00
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
