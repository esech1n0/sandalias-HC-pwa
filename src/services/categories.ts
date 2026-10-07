import "server-only";
import { prisma } from "@/lib/prisma";

export async function getCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(name: string, color: string = "#cfd500") {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("El nombre de la categoría es obligatorio.");

  return prisma.category.upsert({
    where: { name: trimmedName },
    update: { color, isActive: true },
    create: { name: trimmedName, color, isActive: true },
  });
}

export async function updateCategory(id: string, name: string, color: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("El nombre de la categoría es obligatorio.");

  return prisma.category.update({
    where: { id },
    data: { name: trimmedName, color },
  });
}

export async function deleteCategory(id: string) {
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  return prisma.category.delete({
    where: { id },
  });
}

