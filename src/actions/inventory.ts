"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { createProduct, updateProduct, deleteProduct } from "@/services/products";
import { adjustInventoryManual } from "@/services/inventory";
import { createPurchaseEntry, CreatePurchaseInput } from "@/services/purchases";
import { createCategory, updateCategory, deleteCategory } from "@/services/categories";

function serializeProduct(product: any) {
  if (!product) return null;
  return {
    ...product,
    salePrice: Number(product.salePrice),
    currentCost: Number(product.currentCost),
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
  };
}

function assertAdmin(user: { username: string }) {
  if (user.username.toLowerCase() === "empleado") {
    throw new Error("Acción no permitida para la cuenta de empleado.");
  }
}

export async function createProductAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || null;
  const categoryId = formData.get("categoryId")?.toString() || "";
  const salePrice = parseFloat(formData.get("salePrice")?.toString() || "0");
  const currentCost = parseFloat(formData.get("currentCost")?.toString() || "0");
  const stock = parseInt(formData.get("stock")?.toString() || "0", 10);
  const minStock = parseInt(formData.get("minStock")?.toString() || "5", 10);
  const imageUrl = formData.get("imageUrl")?.toString() || null;

  const product = await createProduct({
    name,
    description,
    categoryId,
    salePrice,
    currentCost,
    stock,
    minStock,
    imageUrl,
    userId: user.id,
  });

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return serializeProduct(product);
}

export async function updateProductAction(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() || null;
  const categoryId = formData.get("categoryId")?.toString();
  const salePrice = formData.has("salePrice")
    ? parseFloat(formData.get("salePrice")?.toString() || "0")
    : undefined;
  const currentCost = formData.has("currentCost")
    ? parseFloat(formData.get("currentCost")?.toString() || "0")
    : undefined;
  const minStock = formData.has("minStock")
    ? parseInt(formData.get("minStock")?.toString() || "5", 10)
    : undefined;
  const imageUrl = formData.get("imageUrl")?.toString() || null;
  const isActive = formData.has("isActive")
    ? formData.get("isActive") === "true"
    : undefined;

  const product = await updateProduct(id, {
    name,
    description,
    categoryId,
    salePrice,
    currentCost,
    minStock,
    imageUrl,
    isActive,
  });

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return serializeProduct(product);
}

export async function adjustStockAction(
  productId: string,
  newStock: number,
  reason: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const product = await adjustInventoryManual({
    productId,
    newStock,
    reason,
    userId: user.id,
  });

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return serializeProduct(product);
}

export async function createPurchaseAction(
  data: Omit<CreatePurchaseInput, "userId">
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const purchase = await createPurchaseEntry({
    ...data,
    userId: user.id,
  });

  revalidatePath("/inventario");
  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/reportes");

  return JSON.parse(JSON.stringify(purchase));
}

export async function createCategoryAction(name: string, color: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const cat = await createCategory(name, color);
  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return {
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
}

export async function updateCategoryAction(id: string, name: string, color: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const cat = await updateCategory(id, name, color);
  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return {
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
}

export async function deleteCategoryAction(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const cat = await deleteCategory(id);
  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return {
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
}

export async function deleteProductAction(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  assertAdmin(user);

  const product = await deleteProduct(id);
  revalidatePath("/inventario");
  revalidatePath("/ventas");
  return serializeProduct(product);
}


