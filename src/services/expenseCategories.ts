import "server-only";
import { prisma } from "@/lib/prisma";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Renta",
  "Servicios (Luz / Agua)",
  "Sueldos",
  "Transporte",
  "Mantenimiento",
];

export async function getExpenseCategories() {
  const count = await prisma.expenseCategory.count();
  if (count === 0) {
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      await prisma.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  return prisma.expenseCategory.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function createExpenseCategory(name: string) {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("El nombre de la categoría es obligatorio.");
  }

  return prisma.expenseCategory.upsert({
    where: { name: cleanName },
    update: {},
    create: { name: cleanName },
  });
}
