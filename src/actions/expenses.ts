"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { createExpense } from "@/services/expenses";
import { ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";

export async function createExpenseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const concept = formData.get("concept")?.toString() || "";
  const category = (formData.get("category")?.toString() || "OTHER") as ExpenseCategory;
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
  return expense;
}
