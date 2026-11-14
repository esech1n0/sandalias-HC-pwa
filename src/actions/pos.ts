"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { openCashRegister, createWithdrawal, createCashDeposit } from "@/services/cash";
import { createSaleTransaction, CreateSaleInput } from "@/services/sales";
import { serializeData } from "@/lib/serialize";
import {
  createSaleSchema,
  idSchema,
  moneySchema,
  parseInput,
  positiveMoneySchema,
  reasonSchema,
} from "@/lib/validation";
import { z } from "zod";

export async function openCashRegisterAction(openingBalance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  const balance = parseInput(moneySchema, openingBalance);

  const register = await openCashRegister(balance, user.id);
  revalidatePath("/ventas");
  revalidatePath("/caja");
  return serializeData(register);
}

const cashMovementSchema = z.object({
  cashRegisterId: idSchema,
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: positiveMoneySchema,
  reason: reasonSchema,
});

export async function createCashMovementAction(data: {
  cashRegisterId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  const input = parseInput(cashMovementSchema, data);

  let result;
  if (input.type === "WITHDRAWAL") {
    result = await createWithdrawal(input.cashRegisterId, input.amount, input.reason, user.id);
  } else {
    result = await createCashDeposit(input.cashRegisterId, input.amount, input.reason, user.id);
  }

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/reportes");

  return serializeData(result);
}

export async function completeSaleAction(data: Omit<CreateSaleInput, "userId">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  const input = parseInput(createSaleSchema, data);

  const result = await createSaleTransaction({
    ...input,
    userId: user.id,
  });

  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/caja");
  revalidatePath("/consultas");
  revalidatePath("/reportes");

  return serializeData(result);
}
