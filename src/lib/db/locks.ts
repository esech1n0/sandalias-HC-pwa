import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// ==============================================================================
// Bloqueos de filas dentro de transacciones (PostgreSQL)
// Evitan que dos operaciones simultáneas lean el mismo stock o saldo de caja y
// una sobrescriba a la otra (venta de stock inexistente, caja descuadrada).
// Deben llamarse ANTES de leer los valores que se van a modificar.
// ==============================================================================

type Tx = Prisma.TransactionClient;

/** Bloquea los productos indicados hasta que termine la transacción (orden fijo para evitar deadlocks). */
export async function lockProducts(tx: Tx, productIds: string[]): Promise<void> {
  const ids = Array.from(new Set(productIds)).sort();
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ANY(${ids}::text[]) ORDER BY "id" FOR UPDATE`;
}

/** Bloquea una caja específica hasta que termine la transacción. */
export async function lockCashRegister(tx: Tx, cashRegisterId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "cash_registers" WHERE "id" = ${cashRegisterId} FOR UPDATE`;
}

/** Bloquea la(s) caja(s) abierta(s) hasta que termine la transacción. */
export async function lockOpenCashRegister(tx: Tx): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "cash_registers" WHERE "status" = 'OPEN' FOR UPDATE`;
}

/**
 * Serializa operaciones que comparten una clave lógica (p. ej. generar folios del día
 * o abrir caja). El candado se libera solo al terminar la transacción.
 */
export async function lockKey(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

/**
 * Siguiente folio correlativo con el prefijo dado (p. ej. "VTA-20261113-").
 * Debe llamarse después de `lockKey(tx, prefijo)` para que sea único.
 */
export async function nextFolio(
  findLast: (prefix: string) => Promise<{ folio: string } | null>,
  prefix: string
): Promise<string> {
  const last = await findLast(prefix);
  return formatNextFolio(prefix, last?.folio ?? null);
}

/** Calcula el folio siguiente a `lastFolio` (función pura, probada en tests). */
export function formatNextFolio(prefix: string, lastFolio: string | null): string {
  const lastNumber = lastFolio ? parseInt(lastFolio.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}
