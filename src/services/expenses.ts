import "server-only";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";

export interface CreateExpenseInput {
  concept: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string | null;
  userId?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
  const concept = input.concept.trim();
  if (!concept) throw new Error("El concepto del gasto es obligatorio.");
  if (input.amount <= 0) throw new Error("El monto del gasto debe ser mayor a cero.");

  return prisma.$transaction(async (tx) => {
    let openRegister = null;
    if (input.paymentMethod === "CASH") {
      openRegister = await tx.cashRegister.findFirst({
        where: { status: "OPEN" },
      });
    }

    const expense = await tx.expense.create({
      data: {
        concept,
        category: input.category,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        description: input.description?.trim() || null,
        cashRegisterId: openRegister ? openRegister.id : null,
        userId: input.userId,
      },
    });

    if (input.paymentMethod === "CASH" && openRegister) {
      await tx.cashMovement.create({
        data: {
          cashRegisterId: openRegister.id,
          type: "EXPENSE",
          amount: input.amount,
          reason: `Gasto: ${concept} (${input.category})`,
          userId: input.userId,
        },
      });

      const newExpensesCashTotal = Number(openRegister.expensesCashTotal) + input.amount;
      const newExpectedCash = Number(openRegister.expectedCash) - input.amount;

      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: {
          expensesCashTotal: newExpensesCashTotal,
          expectedCash: newExpectedCash,
        },
      });
    }

    return expense;
  });
}

export async function getExpenses(limit: number = 50) {
  return prisma.expense.findMany({
    include: {
      user: { select: { name: true, username: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });
}
