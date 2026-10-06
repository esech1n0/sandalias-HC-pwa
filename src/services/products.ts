import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { triggerLowStockNotification } from "./notifications";

export interface CreateProductInput {
  name: string;
  description?: string | null;
  categoryId: string;
  salePrice: number;
  currentCost: number;
  stock?: number;
  minStock?: number;
  imageUrl?: string | null;
  userId?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  categoryId?: string;
  salePrice?: number;
  minStock?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

export async function getProducts(options?: {
  query?: string;
  categoryId?: string;
  onlyActive?: boolean;
}) {
  const where: Prisma.ProductWhereInput = {};

  if (options?.onlyActive !== false) {
    where.isActive = true;
  }

  if (options?.categoryId && options.categoryId !== "ALL") {
    where.categoryId = options.categoryId;
  }

  if (options?.query && options.query.trim().length > 0) {
    where.name = {
      contains: options.query.trim(),
      mode: "insensitive",
    };
  }

  return prisma.product.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      costHistories: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      inventoryMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true, username: true } } },
      },
    },
  });
}

export async function createProduct(input: CreateProductInput) {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre del producto es obligatorio.");
  if (input.salePrice < 0) throw new Error("El precio de venta no puede ser negativo.");
  if (input.currentCost < 0) throw new Error("El costo de adquisición no puede ser negativo.");

  const initialStock = Math.max(0, Math.floor(input.stock || 0));
  const minStock = input.minStock !== undefined ? Math.floor(input.minStock) : 5;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        description: input.description,
        categoryId: input.categoryId,
        salePrice: input.salePrice,
        currentCost: input.currentCost,
        stock: initialStock,
        minStock,
        imageUrl: input.imageUrl,
        isActive: true,
      },
      include: { category: true },
    });

    // Registrar costo inicial en el historial
    await tx.productCostHistory.create({
      data: {
        productId: product.id,
        cost: input.currentCost,
        quantityPurchased: initialStock,
        reason: "Costo inicial al registrar producto",
      },
    });

    // Si tiene stock inicial, registrar movimiento de inventario
    if (initialStock > 0) {
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: "ADJUSTMENT",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: "Inventario inicial al registrar producto",
          userId: input.userId,
        },
      });
    }

    if (initialStock < minStock) {
      await triggerLowStockNotification(product.id, initialStock, minStock, product.name);
    }

    return product;
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const data: Prisma.ProductUncheckedUpdateInput = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description;
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.salePrice !== undefined) data.salePrice = input.salePrice;
  if (input.minStock !== undefined) data.minStock = Math.floor(input.minStock);
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  });

  if (updated.stock < updated.minStock) {
    await triggerLowStockNotification(updated.id, updated.stock, updated.minStock, updated.name);
  }

  return updated;
}
