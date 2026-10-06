import "server-only";
import { prisma } from "@/lib/prisma";
import { triggerLowStockNotification } from "./notifications";

export interface AdjustStockInput {
  productId: string;
  newStock: number;
  reason: string;
  userId: string;
}

export async function adjustInventoryManual(input: AdjustStockInput) {
  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error("El motivo del ajuste de inventario es obligatorio.");
  }

  const targetStock = Math.floor(input.newStock);
  if (targetStock < 0) {
    throw new Error("El stock no puede ser negativo.");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new Error("Producto no encontrado.");
    }

    const previousStock = product.stock;
    const quantityDelta = targetStock - previousStock;

    if (quantityDelta === 0) {
      return product;
    }

    // 1. Actualizar stock del producto
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { stock: targetStock },
      include: { category: true },
    });

    // 2. Registrar movimiento obligatorio con trazabilidad
    await tx.inventoryMovement.create({
      data: {
        productId: product.id,
        type: "ADJUSTMENT",
        quantity: quantityDelta,
        previousStock,
        newStock: targetStock,
        reason,
        userId: input.userId,
      },
    });

    // 3. Revisar alerta de bajo stock
    if (targetStock < updatedProduct.minStock) {
      await triggerLowStockNotification(
        updatedProduct.id,
        targetStock,
        updatedProduct.minStock,
        updatedProduct.name
      );
    }

    return updatedProduct;
  });
}

export async function getInventoryMovements(productId?: string, limit: number = 50) {
  const where = productId ? { productId } : {};
  return prisma.inventoryMovement.findMany({
    where,
    include: {
      product: { select: { name: true } },
      user: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
