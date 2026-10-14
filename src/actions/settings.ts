"use server";

import { revalidatePath } from "next/cache";
import { updateSystemSettings } from "@/services/settings";
import { getSession } from "@/lib/auth/session";
import { serializeData } from "@/lib/serialize";

export async function updateSettingsAction(data: {
  allowBelowCostSales?: boolean;
  defaultMinStock?: number;
  businessName?: string;
  headerColor?: string;
  cardCommissionEnabled?: boolean;
  cardCommissionPercentage?: number;
}) {
  const session = await getSession();
  if (!session?.userId || session?.username?.toLowerCase() === "empleado") {
    return { success: false, error: "No autorizado para cuenta de empleado." };
  }

  if (data.cardCommissionPercentage !== undefined) {
    if (isNaN(data.cardCommissionPercentage) || data.cardCommissionPercentage < 0 || data.cardCommissionPercentage > 100) {
      return { success: false, error: "El porcentaje de comisión debe estar entre 0% y 100%." };
    }
  }

  try {
    const updated = await updateSystemSettings(data);
    revalidatePath("/configuracion");
    revalidatePath("/ventas");
    revalidatePath("/inventario");
    return { success: true, settings: serializeData(updated) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al actualizar configuración";
    return { success: false, error: msg };
  }
}
