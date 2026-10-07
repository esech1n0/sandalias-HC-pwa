"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { openCashRegister, createWithdrawal, createCashDeposit, closeCashRegister } from "@/services/cash";
import { serializeData } from "@/lib/serialize";

export async function openCashRegisterAction(openingBalance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const register = await openCashRegister(openingBalance, user.id);
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

  const result = await createWithdrawal(cashRegisterId, amount, reason, user.id);
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

  const result = await createCashDeposit(cashRegisterId, amount, reason, user.id);
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

  const result = await closeCashRegister(cashRegisterId, countedCash, notes, user.id);
  revalidatePath("/caja");
  revalidatePath("/ventas");
  revalidatePath("/reportes");
  return serializeData(result);
}
