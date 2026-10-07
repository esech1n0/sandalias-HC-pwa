"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { createExpense } from "@/services/expenses";
import { createExpenseCategory } from "@/services/expenseCategories";
import { PaymentMethod } from "@/generated/prisma/client";
import { serializeData } from "@/lib/serialize";

export async function createExpenseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const concept = formData.get("concept")?.toString().trim() || "";
  let category = formData.get("category")?.toString().trim() || "OTHER";
  const customCategory = formData.get("customCategory")?.toString().trim();

  if (category === "OTHER" || category === "Otros") {
    if (!customCategory) {
      throw new Error("Por favor, ingresa el nombre de la nueva categoría.");
    }
    category = customCategory;
    // Guardar en la BD y añadir como nueva categoría
    await createExpenseCategory(category);
  }

  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const paymentMethod = (formData.get("paymentMethod")?.toString() || "CASH") as PaymentMethod;
  const description = formData.get("description")?.toString() || null;

  const expense = await createExpense({
    concept,
    category,
    amount,
    paymentMethod,
    description,
    userId: user.id,
  });

  revalidatePath("/gastos");
  revalidatePath("/caja");
  revalidatePath("/reportes");

  return {
    success: true,
    expense: serializeData(expense),
  };
}
