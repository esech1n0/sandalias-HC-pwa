"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { cancelSaleTransaction } from "@/services/sales";
import { serializeData } from "@/lib/serialize";

export async function cancelSaleAction(saleId: string, reason?: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("No autenticado. Inicie sesión para realizar esta operación.");
  }

  const result = await cancelSaleTransaction(saleId, user.id, reason);

  revalidatePath("/consultas");
  revalidatePath("/reportes");
  revalidatePath("/inventario");
  revalidatePath("/caja");
  revalidatePath("/ventas");

  return serializeData(result);
}
