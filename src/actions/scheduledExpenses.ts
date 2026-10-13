"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  createScheduledExpense,
  payScheduledExpense,
  cancelScheduledExpense,
  updateScheduledExpense,
} from "@/services/scheduledExpenses";
import { createExpenseCategory } from "@/services/expenseCategories";
import { PaymentMethod, ScheduledExpenseFrequency } from "@/generated/prisma/client";
import { serializeData } from "@/lib/serialize";

export async function createScheduledExpenseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  if (user.username.toLowerCase() === "empleado") {
    throw new Error("Acción no permitida para la cuenta de empleado.");
  }

  const concept = formData.get("concept")?.toString().trim() || "";
  let category = formData.get("category")?.toString().trim() || "OTHER";
  const customCategory = formData.get("customCategory")?.toString().trim();

  if (category === "OTHER" || category === "Otros") {
    if (!customCategory) {
      throw new Error("Por favor, ingresa el nombre de la nueva categoría.");
    }
    category = customCategory;
    await createExpenseCategory(category);
  }

  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const dueDate = formData.get("dueDate")?.toString() || null;
  const isRecurring = formData.get("isRecurring") === "true";
  const frequency = (formData.get("frequency")?.toString() || null) as ScheduledExpenseFrequency | null;
  const startDate = formData.get("startDate")?.toString() || null;
  const endDate = formData.get("endDate")?.toString() || null;
  const notes = formData.get("notes")?.toString() || null;

  const scheduled = await createScheduledExpense({
    concept,
    category,
    amount,
    dueDate,
    isRecurring,
    frequency,
    startDate,
    endDate,
    notes,
    userId: user.id,
  });

  revalidatePath("/gastos");
  revalidatePath("/reportes");

  return {
    success: true,
    scheduled: serializeData(scheduled),
  };
}

export async function payScheduledExpenseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  if (user.username.toLowerCase() === "empleado") {
    throw new Error("Acción no permitida para la cuenta de empleado.");
  }

  const scheduledExpenseId = formData.get("scheduledExpenseId")?.toString() || "";
  const paymentMethod = (formData.get("paymentMethod")?.toString() || "CASH") as PaymentMethod;
  const paymentDate = formData.get("paymentDate")?.toString() || null;
  const description = formData.get("description")?.toString() || null;

  const result = await payScheduledExpense({
    scheduledExpenseId,
    paymentMethod,
    paymentDate,
    description,
    userId: user.id,
  });

  revalidatePath("/gastos");
  revalidatePath("/caja");
  revalidatePath("/reportes");

  return {
    success: true,
    scheduled: serializeData(result.scheduled),
    expense: serializeData(result.expense),
  };
}

export async function cancelScheduledExpenseAction(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  if (user.username.toLowerCase() === "empleado") {
    throw new Error("Acción no permitida para la cuenta de empleado.");
  }

  const cancelled = await cancelScheduledExpense(id);

  revalidatePath("/gastos");
  revalidatePath("/reportes");

  return {
    success: true,
    scheduled: serializeData(cancelled),
  };
}

export async function updateScheduledExpenseAction(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  if (user.username.toLowerCase() === "empleado") {
    throw new Error("Acción no permitida para la cuenta de empleado.");
  }

  const concept = formData.get("concept")?.toString().trim() || "";
  let category = formData.get("category")?.toString().trim() || "OTHER";
  const customCategory = formData.get("customCategory")?.toString().trim();

  if (category === "OTHER" || category === "Otros") {
    if (!customCategory) {
      throw new Error("Por favor, ingresa el nombre de la nueva categoría.");
    }
    category = customCategory;
    await createExpenseCategory(category);
  }

  const amount = parseFloat(formData.get("amount")?.toString() || "0");
  const dueDate = formData.get("dueDate")?.toString() || "";
  const notes = formData.get("notes")?.toString() || null;

  const updated = await updateScheduledExpense({
    id,
    concept,
    category,
    amount,
    dueDate,
    notes,
  });

  revalidatePath("/gastos");
  revalidatePath("/reportes");

  return {
    success: true,
    scheduled: serializeData(updated),
  };
}
