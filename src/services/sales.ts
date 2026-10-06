import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calculateCart,
  validatePayments,
  CartItemInput,
  PaymentInput,
  DiscountType,
} from "@/lib/sales/calculations";
import { triggerLowStockNotification } from "./notifications";

export interface CreateSaleInput {
  items: CartItemInput[];
  payments: PaymentInput[];
  cartDiscount?: { type: DiscountType; value: number } | null;
  userId?: string | null;
}

export async function createSaleTransaction(input: CreateSaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("No hay productos en el carrito.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Verificar configuración del sistema para venta por debajo del costo
    const settings = await tx.systemSettings.findUnique({
      where: { id: "default" },
    });
    const allowBelowCost = settings?.allowBelowCostSales ?? true;

    // 2. Verificar existencia en base de datos para cada artículo
    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Producto ${item.name} no encontrado.`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}.`
        );
      }

      // Asignar el costo histórico actual real de la base de datos para el cálculo
      item.unitCost = Number(product.currentCost);
    }

    // 3. Calcular carrito con descuentos y utilidad
    const cart = calculateCart(input.items, input.cartDiscount);

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

    // 5. Obtener caja abierta (si aplica)
    const openRegister = await tx.cashRegister.findFirst({
      where: { status: "OPEN" },
    });

    // 6. Generar folio correlativo del día
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countToday = await tx.sale.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const folio = `VTA-${dateStr}-${String(countToday + 1).padStart(4, "0")}`;

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
        cashRegisterId: openRegister ? openRegister.id : null,
        userId: input.userId,
      },
    });

    // 8. Crear partidas (SaleItem) y descontar inventario
    for (const item of cart.items) {
      await tx.saleItem.create({
        data: {
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
        },
      });

      // Disminuir stock del producto
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!currentProduct) continue;

      const previousStock = currentProduct.stock;
      const newStock = previousStock - item.quantity;

      await tx.product.update({
        where: { id: currentProduct.id },
        data: { stock: newStock },
      });

      // Registrar movimiento de inventario
      await tx.inventoryMovement.create({
        data: {
          productId: currentProduct.id,
          type: "SALE",
          quantity: -item.quantity,
          previousStock,
          newStock,
          reason: `Venta ${folio}`,
          userId: input.userId,
        },
      });

      // Verificar bajo stock
      if (newStock < currentProduct.minStock) {
        await triggerLowStockNotification(
          currentProduct.id,
          newStock,
          currentProduct.minStock,
          currentProduct.name
        );
      }
    }

    // 9. Crear registros de Pago
    let cashCovered = 0;
    let cardCovered = 0;
    let transferCovered = 0;

    for (const p of input.payments) {
      if (p.amount <= 0) continue;

      const paymentAmount = p.amount;
      let change = 0;

      if (p.method === "CASH") {
        change = paymentValidation.changeGiven;
        cashCovered += paymentAmount;
      } else if (p.method === "CARD") {
        cardCovered += paymentAmount;
      } else if (p.method === "TRANSFER") {
        transferCovered += paymentAmount;
      }

      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: p.method,
          amount: paymentAmount,
          receivedAmount: p.method === "CASH" ? p.receivedAmount : null,
          changeGiven: p.method === "CASH" && change > 0 ? change : null,
        },
      });
    }

    // 10. Actualizar caja abierta si existe
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
          cashSales: Number(openRegister.cashSales) + cashCovered,
          cardSales: Number(openRegister.cardSales) + cardCovered,
          transferSales: Number(openRegister.transferSales) + transferCovered,
          expectedCash: Number(openRegister.expectedCash) + cashCovered,
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

export async function getSalesHistory(limit: number = 50) {
  return prisma.sale.findMany({
    include: {
      items: true,
      payments: true,
      user: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSaleByFolio(folio: string) {
  return prisma.sale.findUnique({
    where: { folio },
    include: {
      items: true,
      payments: true,
      user: { select: { name: true, username: true } },
    },
  });
}
