"use server";

import { revalidatePath } from "next/cache";
import { updateSystemSettings } from "@/services/settings";
import { getSession } from "@/lib/auth/session";

export async function updateSettingsAction(data: {
  allowBelowCostSales?: boolean;
  defaultMinStock?: number;
  businessName?: string;
  headerColor?: string;
}) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "No autorizado." };
  }

  try {
    const updated = await updateSystemSettings(data);
    revalidatePath("/configuracion");
    revalidatePath("/ventas");
    revalidatePath("/inventario");
    return { success: true, settings: updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al actualizar configuración";
    return { success: false, error: msg };
  }
}
