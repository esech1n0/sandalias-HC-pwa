import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSystemSettings() {
  const settings = await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      allowBelowCostSales: true,
      defaultMinStock: 5,
      businessName: "Sandalias HC",
      headerColor: "#cfd500",
      cardCommissionEnabled: false,
      cardCommissionPercentage: 0,
    },
  });

  return {
    ...settings,
    cardCommissionPercentage: Number(settings.cardCommissionPercentage ?? 0),
  };
}

export async function updateSystemSettings(data: {
  allowBelowCostSales?: boolean;
  defaultMinStock?: number;
  businessName?: string;
  headerColor?: string;
  cardCommissionEnabled?: boolean;
  cardCommissionPercentage?: number;
}) {
  const updated = await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      allowBelowCostSales: data.allowBelowCostSales ?? true,
      defaultMinStock: data.defaultMinStock ?? 5,
      businessName: data.businessName ?? "Sandalias HC",
      headerColor: data.headerColor ?? "#cfd500",
      cardCommissionEnabled: data.cardCommissionEnabled ?? false,
      cardCommissionPercentage: data.cardCommissionPercentage ?? 0,
    },
  });

  return {
    ...updated,
    cardCommissionPercentage: Number(updated.cardCommissionPercentage ?? 0),
  };
}
