"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { openCashRegister, createWithdrawal, createCashDeposit, closeCashRegister } from "@/services/cash";
import { serializeData } from "@/lib/serialize";
import {
  idSchema,
  moneySchema,
  notesSchema,
  parseInput,
  positiveMoneySchema,
  reasonSchema,
} from "@/lib/validation";

export async function openCashRegisterAction(openingBalance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");
  const balance = parseInput(moneySchema, openingBalance);

  const register = await openCashRegister(balance, user.id);
  revalidatePath("/ventas");
  revalidatePath("/caja");
  return serializeData(register);
}

export async function createWithdrawalAction(
  cashRegisterId: string,
  amount: number,
  reason: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const result = await createWithdrawal(
    parseInput(idSchema, cashRegisterId),
    parseInput(positiveMoneySchema, amount),
    parseInput(reasonSchema, reason),
    user.id
  );
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return serializeData(result);
}

export async function createCashDepositAction(
  cashRegisterId: string,
  amount: number,
  reason: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const result = await createCashDeposit(
    parseInput(idSchema, cashRegisterId),
    parseInput(positiveMoneySchema, amount),
    parseInput(reasonSchema, reason),
    user.id
  );
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return serializeData(result);
}

export async function closeCashRegisterAction(
  cashRegisterId: string,
  countedCash: number,
  notes: string = ""
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const result = await closeCashRegister(
    parseInput(idSchema, cashRegisterId),
    parseInput(moneySchema, countedCash),
    parseInput(notesSchema, notes ?? ""),
    user.id
  );
  revalidatePath("/caja");
  revalidatePath("/ventas");
  revalidatePath("/reportes");
  return serializeData(result);
}
