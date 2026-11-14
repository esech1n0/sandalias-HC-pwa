import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calculateCart,
  validatePayments,
  CartItemInput,
  PaymentInput,
  DiscountType,
} from "@/lib/sales/calculations";
import { calculateCardCommission } from "@/lib/sales/commission";
import { roundMoney } from "@/lib/money";
import { businessDateKey } from "@/lib/dates";
import {
  lockCashRegister,
  lockKey,
  lockOpenCashRegister,
  lockProducts,
  nextFolio,
} from "@/lib/db/locks";
import { triggerLowStockNotification } from "./notifications";
import type { Prisma } from "@/generated/prisma/client";

export type SaleHistoryItem = Prisma.SaleGetPayload<{
  include: {
    items: true;
    payments: true;
    user: { select: { name: true; username: true } };
    cancelledBy: { select: { name: true; username: true } };
  };
}>;

export interface CreateSaleInput {
  items: CartItemInput[];
  payments: PaymentInput[];
  cartDiscount?: { type: DiscountType; value: number } | null;
  cardCommissionRate?: number | null;
  userId?: string | null;
}

export async function createSaleTransaction(input: CreateSaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("No hay productos en el carrito.");
  }

  return prisma.$transaction(async (tx) => {
    // 0. Bloqueos: generador de folios del día, productos del carrito y caja abierta.
    //    Así dos cobros simultáneos no venden el mismo stock ni repiten folio.
    const folioPrefix = `VTA-${businessDateKey()}-`;
    await lockKey(tx, folioPrefix);
    await lockProducts(tx, input.items.map((i) => i.productId));
    await lockOpenCashRegister(tx);

    // 1. Verificar configuración del sistema para venta por debajo del costo
    const settings = await tx.systemSettings.findUnique({
      where: { id: "default" },
    });
    const allowBelowCost = settings?.allowBelowCostSales ?? true;

    // 2. Cargar productos desde la base de datos (fuente de verdad de precio, costo y stock)
    const products = await tx.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) } },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    // Cantidad total pedida por producto (el mismo producto puede venir en varias líneas)
    const requestedByProduct = new Map<string, number>();
    for (const item of input.items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + Math.floor(item.quantity)
      );
    }

    const pricedItems: CartItemInput[] = input.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new Error(`Producto ${item.name} no encontrado.`);
      }
      if (!product.isActive) {
        throw new Error(`El producto "${product.name}" está desactivado y no puede venderse.`);
      }
      const requested = requestedByProduct.get(product.id) ?? 0;
      if (product.stock < requested) {
        throw new Error(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${requested}.`
        );
      }
      // Precio de lista, nombre y costo SIEMPRE desde la BD; el cliente solo decide
      // precio personalizado y descuentos (funciones permitidas del POS).
      return {
        ...item,
        name: product.name,
        originalPrice: Number(product.salePrice),
        unitCost: Number(product.currentCost),
      };
    });

    // 3. Calcular carrito con descuentos y utilidad
    const cart = calculateCart(pricedItems, input.cartDiscount);

    if (cart.isNetLoss && !allowBelowCost) {
      throw new Error(
        "La venta genera pérdida neta y el sistema está configurado para no permitir ventas por debajo del costo."
      );
    }

    // 4. Validar pagos
    const paymentValidation = validatePayments(cart.total, input.payments);
    if (!paymentValidation.isValid) {
      throw new Error(paymentValidation.errorMessage || "Los pagos no cubren el total de la venta.");
    }

    // 5. Obtener caja abierta (si aplica); ya está bloqueada arriba
    const openRegister = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
    });

    // 6. Folio correlativo del día (hora de México), único gracias al candado
    const folio = await nextFolio(
      (prefix) =>
        tx.sale.findFirst({
          where: { folio: { startsWith: prefix } },
          orderBy: { folio: "desc" },
          select: { folio: true },
        }),
      folioPrefix
    );

    // 6b. Calcular comisión por pago con tarjeta si aplica
    const cardPaymentsTotal = input.payments
      .filter((p) => p.method === "CARD")
      .reduce((sum, p) => sum + p.amount, 0);

    let appliedCommissionRate = 0;
    if (cardPaymentsTotal > 0) {
      if (
        input.cardCommissionRate !== undefined &&
        input.cardCommissionRate !== null &&
        Number.isFinite(input.cardCommissionRate)
      ) {
        appliedCommissionRate = Math.max(0, Math.min(100, input.cardCommissionRate));
      } else if (settings?.cardCommissionEnabled) {
        appliedCommissionRate = Number(settings.cardCommissionPercentage ?? 0);
      }
    }

    const cardCommission = calculateCardCommission({
      cardAmount: cardPaymentsTotal,
      rate: appliedCommissionRate,
      isEnabled: appliedCommissionRate > 0,
    });
    const netReceivedAmount = roundMoney(cart.total - cardCommission.commissionAmount);

    // 7. Crear Venta principal (Inmutable)
    const sale = await tx.sale.create({
      data: {
        folio,
        subtotal: cart.itemsSubtotal,
        discountType: cart.cartDiscountType,
        discountValue: cart.cartDiscountValue,
        discountAmount: cart.cartDiscountAmount,
        total: cart.total,
        totalCost: cart.totalCost,
        grossProfit: cart.grossProfit,
        cardCommissionRate: cardCommission.rateApplied,
        cardCommissionAmount: cardCommission.commissionAmount,
        netReceivedAmount,
        cashRegisterId: openRegister ? openRegister.id : null,
        userId: input.userId,
      },
    });

    // 8. Crear partidas (SaleItem) en una sola consulta
    await tx.saleItem.createMany({
      data: cart.items.map((item) => ({
        saleId: sale.id,
        productId: item.productId,
        productName: item.name,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        unitPrice: item.unitPrice,
        discountType: item.discountType,
        discountValue: item.discountValue,
        discountAmount: item.discountAmount,
        unitCost: item.unitCost, // Fotografía histórica del costo
        subtotal: item.subtotal,
        totalCost: item.totalCost,
        profit: item.profit,
      })),
    });

    // 8b. Descontar inventario. Las filas están bloqueadas, así que el stock en memoria es exacto.
    const runningStock = new Map(products.map((p) => [p.id, p.stock]));

    for (const item of cart.items) {
      const product = productsById.get(item.productId)!;
      const previousStock = runningStock.get(product.id)!;
      const newStock = previousStock - item.quantity;
      runningStock.set(product.id, newStock);

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: item.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "SALE",
          quantity: -item.quantity,
          previousStock,
          newStock,
          reason: `Venta ${folio}`,
          userId: input.userId,
        },
      });

      if (newStock < product.minStock) {
        await triggerLowStockNotification(
          product.id,
          newStock,
          product.minStock,
          product.name,
          tx
        );
      }
    }

    // 9. Crear registros de Pago
    let cashCovered = 0;
    let cardCovered = 0;
    let transferCovered = 0;
    let changeAssigned = false;

    for (const p of input.payments) {
      if (p.amount <= 0) continue;

      const paymentAmount = p.amount;
      let change = 0;

      if (p.method === "CASH") {
        // El cambio se registra una sola vez aunque haya varios pagos en efectivo
        if (!changeAssigned) {
          change = paymentValidation.changeGiven;
          changeAssigned = true;
        }
        cashCovered += paymentAmount;
      } else if (p.method === "CARD") {
        cardCovered += paymentAmount;
      } else if (p.method === "TRANSFER") {
        transferCovered += paymentAmount;
      }

      const isCard = p.method === "CARD";
      const paymentCommission = isCard && cardCommission.rateApplied > 0
        ? roundMoney(paymentAmount * (cardCommission.rateApplied / 100))
        : 0;

      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: p.method,
          amount: paymentAmount,
          receivedAmount: p.method === "CASH" ? p.receivedAmount : null,
          changeGiven: p.method === "CASH" && change > 0 ? change : null,
          commissionRate: isCard ? cardCommission.rateApplied : 0,
          commissionAmount: paymentCommission,
          netAmount: roundMoney(paymentAmount - paymentCommission),
        },
      });
    }

    // 10. Actualizar caja abierta si existe (incrementos atómicos)
    if (openRegister) {
      if (cashCovered > 0) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: openRegister.id,
            type: "SALE",
            amount: cashCovered,
            reason: `Venta en efectivo ${folio}`,
            userId: input.userId,
          },
        });
      }

      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: {
          cashSales: { increment: cashCovered },
          cardSales: { increment: cardCovered },
          transferSales: { increment: transferCovered },
          expectedCash: { increment: cashCovered },
        },
      });
    }

    return {
      sale,
      folio,
      changeGiven: paymentValidation.changeGiven,
    };
  });
}

export async function cancelSaleTransaction(
  saleId: string,
  userId: string,
  reason: string = "Cancelación de venta"
) {
  const cleanReason = reason.trim() || "Cancelación de venta";

  return prisma.$transaction(async (tx) => {
    // 1. Marcar como CANCELLED solo si sigue COMPLETED (evita doble cancelación simultánea)
    const marked = await tx.sale.updateMany({
      where: { id: saleId, status: "COMPLETED" },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledReason: cleanReason,
        cancelledById: userId,
      },
    });

    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new Error("Venta no encontrada.");
    }

    if (marked.count === 0) {
      throw new Error(`La venta con folio ${sale.folio} ya fue cancelada previamente.`);
    }

    // 2. Restablecer el stock de los productos vendidos y registrar movimientos de inventario
    await lockProducts(tx, sale.items.map((i) => i.productId));

    for (const item of sale.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        const previousStock = product.stock;
        const newStock = previousStock + item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: item.quantity } },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            type: "ADJUSTMENT",
            quantity: item.quantity, // Positivo para representar reingreso al inventario
            previousStock,
            newStock,
            reason: `Cancelación de venta ${sale.folio}: ${cleanReason}`,
            userId,
          },
        });
      }
    }

    // 3. Ajustar la caja para que el corte cuadre con la devolución del dinero
    let cashPaid = 0;
    let cardPaid = 0;
    let transferPaid = 0;
    for (const p of sale.payments) {
      const amount = Number(p.amount);
      if (p.method === "CASH") cashPaid += amount;
      else if (p.method === "CARD") cardPaid += amount;
      else if (p.method === "TRANSFER") transferPaid += amount;
    }

    if (sale.cashRegisterId) {
      await lockCashRegister(tx, sale.cashRegisterId);
    }
    await lockOpenCashRegister(tx);

    const originalRegister = sale.cashRegisterId
      ? await tx.cashRegister.findUnique({ where: { id: sale.cashRegisterId } })
      : null;

    if (originalRegister && originalRegister.status === "OPEN") {
      // La caja donde se cobró sigue abierta: se revierte la venta en sus totales
      if (cashPaid > 0) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: originalRegister.id,
            type: "ADJUSTMENT",
            amount: cashPaid,
            reason: `Devolución en efectivo por cancelación ${sale.folio}`,
            userId,
          },
        });
      }

      await tx.cashRegister.update({
        where: { id: originalRegister.id },
        data: {
          cashSales: { decrement: cashPaid },
          cardSales: { decrement: cardPaid },
          transferSales: { decrement: transferPaid },
          expectedCash: { decrement: cashPaid },
        },
      });
    } else if (cashPaid > 0) {
      // La caja original ya cerró (o no hubo): el reembolso sale de la caja abierta actual
      const currentOpenRegister = await tx.cashRegister.findFirst({
        where: { status: "OPEN" },
      });
      if (currentOpenRegister) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: currentOpenRegister.id,
            type: "ADJUSTMENT",
            amount: cashPaid,
            reason: `Devolución en efectivo por cancelación de venta ${sale.folio}`,
            userId,
          },
        });
        await tx.cashRegister.update({
          where: { id: currentOpenRegister.id },
          data: {
            expectedCash: { decrement: cashPaid },
            withdrawalsTotal: { increment: cashPaid },
          },
        });
      }
    }

    return sale;
  });
}

export async function getSalesHistory(limit: number = 50): Promise<SaleHistoryItem[]> {
  return prisma.sale.findMany({
    include: {
      items: true,
      payments: true,
      user: { select: { name: true, username: true } },
      cancelledBy: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSaleByFolio(folio: string): Promise<SaleHistoryItem | null> {
  return prisma.sale.findUnique({
    where: { folio },
    include: {
      items: true,
      payments: true,
      user: { select: { name: true, username: true } },
      cancelledBy: { select: { name: true, username: true } },
    },
  });
}
