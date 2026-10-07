"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { openCashRegister, createWithdrawal, createCashDeposit } from "@/services/cash";
import { createSaleTransaction, CreateSaleInput } from "@/services/sales";
import { serializeData } from "@/lib/serialize";

export async function openCashRegisterAction(openingBalance: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const register = await openCashRegister(openingBalance, user.id);
  revalidatePath("/ventas");
  revalidatePath("/caja");
  return serializeData(register);
}

export async function createCashMovementAction(data: {
  cashRegisterId: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  let result;
  if (data.type === "WITHDRAWAL") {
    result = await createWithdrawal(data.cashRegisterId, data.amount, data.reason, user.id);
  } else {
    result = await createCashDeposit(data.cashRegisterId, data.amount, data.reason, user.id);
  }

  revalidatePath("/ventas");
  revalidatePath("/caja");
  revalidatePath("/reportes");

  return serializeData(result);
}

export async function completeSaleAction(data: Omit<CreateSaleInput, "userId">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado.");

  const result = await createSaleTransaction({
    ...data,
    userId: user.id,
  });

  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/caja");
  revalidatePath("/consultas");
  revalidatePath("/reportes");

  return serializeData(result);
}
