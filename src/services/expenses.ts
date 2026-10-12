import "server-only";
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@/generated/prisma/client";
import { parseExpenseDate } from "@/lib/expenses/date";

export interface CreateExpenseInput {
  concept: string;
  category: string;
  amount: number;
  date?: Date | string | null;
  paymentMethod: PaymentMethod;
  description?: string | null;
  userId?: string | null;
}

export interface UpdateExpenseInput {
  id: string;
  concept: string;
  category: string;
  amount: number;
  date?: Date | string | null;
  paymentMethod: PaymentMethod;
  description?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
  const concept = input.concept.trim();
  if (!concept) throw new Error("El concepto del gasto es obligatorio.");
  if (input.amount <= 0) throw new Error("El monto del gasto debe ser mayor a cero.");

  const expenseDate = parseExpenseDate(input.date);

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
        date: expenseDate,
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

export async function updateExpense(input: UpdateExpenseInput) {
  const concept = input.concept.trim();
  if (!concept) throw new Error("El concepto del gasto es obligatorio.");
  if (input.amount <= 0) throw new Error("El monto del gasto debe ser mayor a cero.");

  const expenseDate = parseExpenseDate(input.date);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.expense.findUnique({
      where: { id: input.id },
    });
    if (!existing) {
      throw new Error("Gasto no encontrado.");
    }

    // Si el gasto estaba vinculado a una caja abierta y cambió el monto o método de pago
    if (existing.cashRegisterId) {
      const register = await tx.cashRegister.findUnique({
        where: { id: existing.cashRegisterId },
      });

      if (register && register.status === "OPEN") {
        const oldCash = existing.paymentMethod === "CASH" ? Number(existing.amount) : 0;
        const newCash = input.paymentMethod === "CASH" ? input.amount : 0;
        const diff = newCash - oldCash;

        if (diff !== 0) {
          const newExpensesCashTotal = Number(register.expensesCashTotal) + diff;
          const newExpectedCash = Number(register.expectedCash) - diff;

          await tx.cashRegister.update({
            where: { id: register.id },
            data: {
              expensesCashTotal: newExpensesCashTotal,
              expectedCash: newExpectedCash,
            },
          });
        }
      }
    }

    const updated = await tx.expense.update({
      where: { id: input.id },
      data: {
        concept,
        category: input.category,
        amount: input.amount,
        date: expenseDate,
        paymentMethod: input.paymentMethod,
        description: input.description?.trim() || null,
      },
    });

    return updated;
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
