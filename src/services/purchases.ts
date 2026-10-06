import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateWeightedAverageCost } from "@/lib/inventory/cost";
import { PaymentMethod } from "@/generated/prisma/client";

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplier?: string | null;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  items: PurchaseItemInput[];
  userId?: string | null;
}

export async function createPurchaseEntry(input: CreatePurchaseInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Debe incluir al menos un producto en la entrada de mercancía.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Obtener caja abierta si el pago fue en EFECTIVO
    let openRegister = null;
    if (input.paymentMethod === "CASH") {
      openRegister = await tx.cashRegister.findFirst({
        where: { status: "OPEN" },
      });
    }

    // 2. Generar folio único para la compra
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await tx.purchase.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const folio = `ENT-${dateStr}-${String(countToday + 1).padStart(4, "0")}`;

    let totalPurchaseAmount = 0;

    // Pre-validar items
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error("La cantidad de compra debe ser un número entero mayor a 0.");
      }
      if (item.unitCost < 0) {
        throw new Error("El costo unitario no puede ser negativo.");
      }
      totalPurchaseAmount += item.quantity * item.unitCost;
    }

    // 3. Crear registro principal de Compra/Entrada
    const purchase = await tx.purchase.create({
      data: {
        folio,
        supplier: input.supplier?.trim() || null,
        total: totalPurchaseAmount,
        paymentMethod: input.paymentMethod,
        notes: input.notes?.trim() || null,
        cashRegisterId: openRegister ? openRegister.id : null,
        userId: input.userId,
      },
    });

    // 4. Procesar cada partida
    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado.`);
      }

      const quantity = Math.floor(item.quantity);
      const unitCost = item.unitCost;
      const subtotal = quantity * unitCost;

      // Calcular nuevo costo por Promedio Ponderado
      const newWeightedCost = calculateWeightedAverageCost({
        currentStock: product.stock,
        currentCost: Number(product.currentCost),
        newQuantity: quantity,
        newUnitCost: unitCost,
      });

      const newStock = product.stock + quantity;

      // Crear item de compra
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: product.id,
          quantity,
          unitCost,
          subtotal,
        },
      });

      // Actualizar producto: stock + promedio ponderado de costo
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: newStock,
          currentCost: newWeightedCost,
        },
      });

      // Registrar historial de costo
      await tx.productCostHistory.create({
        data: {
          productId: product.id,
          cost: unitCost,
          quantityPurchased: quantity,
          reason: `Compra/Entrada ${folio}${input.supplier ? ` - Proveedor: ${input.supplier}` : ""}`,
        },
      });

      // Registrar movimiento de inventario
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "PURCHASE",
          quantity,
          previousStock: product.stock,
          newStock,
          reason: `Entrada de mercancía ${folio}`,
          userId: input.userId,
        },
      });
    }

    // 5. Si fue en EFECTIVO y hay caja abierta, descontar de caja (Caja -$5,000)
    if (input.paymentMethod === "CASH" && openRegister) {
      await tx.cashMovement.create({
        data: {
          cashRegisterId: openRegister.id,
          type: "PURCHASE",
          amount: totalPurchaseAmount,
          reason: `Pago de compra a proveedor ${folio}${input.supplier ? ` (${input.supplier})` : ""}`,
          userId: input.userId,
        },
      });

      const newExpensesCashTotal = Number(openRegister.expensesCashTotal) + totalPurchaseAmount;
      const newExpectedCash = Number(openRegister.expectedCash) - totalPurchaseAmount;

      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: {
          expensesCashTotal: newExpensesCashTotal,
          expectedCash: newExpectedCash,
        },
      });
    }

    return purchase;
  });
}

export async function getPurchases(limit: number = 30) {
  return prisma.purchase.findMany({
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
      user: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
