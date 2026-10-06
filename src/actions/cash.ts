"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { openCashRegister, createWithdrawal, closeCashRegister } from "@/services/cash";

export async function openCashRegisterAction(openingBalance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const register = await openCashRegister(openingBalance, user.id);
  revalidatePath("/ventas");
  revalidatePath("/caja");
  return register;
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
  return result;
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
  return result;
}
