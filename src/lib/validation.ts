import { z } from "zod";

// ==============================================================================
// Validación de entradas de Server Actions
// Las server actions son endpoints públicos: cualquier petición puede llegar con
// NaN, montos negativos, cantidades decimales o campos inesperados.
// ==============================================================================

const MAX_MONEY = 10_000_000;

export const idSchema = z.string().trim().min(1, "Identificador inválido.").max(64);
export const moneySchema = z
  .number({ message: "Monto inválido." })
  .min(0, "El monto no puede ser negativo.")
  .max(MAX_MONEY, "Monto fuera de rango.");
export const positiveMoneySchema = moneySchema.refine((n) => n > 0, "El monto debe ser mayor a cero.");
export const quantitySchema = z
  .number({ message: "Cantidad inválida." })
  .int("La cantidad debe ser un número entero.")
  .positive("La cantidad debe ser mayor a cero.")
  .max(100_000, "Cantidad fuera de rango.");
export const stockSchema = z
  .number({ message: "Stock inválido." })
  .int("El stock debe ser un número entero.")
  .min(0, "El stock no puede ser negativo.")
  .max(1_000_000, "Stock fuera de rango.");
export const paymentMethodSchema = z.enum(["CASH", "CARD", "TRANSFER"], {
  message: "Método de pago inválido.",
});
const discountTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);
const shortText = (max: number) => z.string().max(max, `El texto excede ${max} caracteres.`);

export const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: idSchema,
        name: shortText(200),
        originalPrice: moneySchema,
        customPrice: moneySchema.nullable().optional(),
        unitCost: moneySchema,
        quantity: quantitySchema,
        discountType: discountTypeSchema.nullable().optional(),
        discountValue: moneySchema.optional(),
      })
    )
    .min(1, "No hay productos en el carrito.")
    .max(200, "Demasiados productos en una sola venta."),
  payments: z
    .array(
      z.object({
        method: paymentMethodSchema,
        amount: moneySchema,
        receivedAmount: moneySchema.optional(),
      })
    )
    .max(10, "Demasiados pagos en una sola venta."),
  cartDiscount: z
    .object({ type: discountTypeSchema, value: moneySchema })
    .nullable()
    .optional(),
  cardCommissionRate: z.number().min(0).max(100).nullable().optional(),
});

export const createPurchaseSchema = z.object({
  supplier: shortText(200).nullable().optional(),
  paymentMethod: paymentMethodSchema,
  notes: shortText(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: quantitySchema,
        unitCost: moneySchema,
      })
    )
    .min(1, "Debe incluir al menos un producto en la entrada de mercancía.")
    .max(500),
});

export const reasonSchema = shortText(500);
export const notesSchema = shortText(1000);

/**
 * Valida `data` con `schema` y devuelve el valor tipado; si falla, lanza un Error
 * con el primer mensaje legible (se muestra tal cual en la interfaz).
 */
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(issue?.message || "Datos inválidos.");
  }
  return result.data;
}
