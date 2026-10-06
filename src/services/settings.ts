import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSystemSettings() {
  return prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      allowBelowCostSales: true,
      defaultMinStock: 5,
      businessName: "Sandalias HC",
      headerColor: "#cfd500",
    },
  });
}

export async function updateSystemSettings(data: {
  allowBelowCostSales?: boolean;
  defaultMinStock?: number;
  businessName?: string;
  headerColor?: string;
}) {
  return prisma.systemSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      allowBelowCostSales: data.allowBelowCostSales ?? true,
      defaultMinStock: data.defaultMinStock ?? 5,
      businessName: data.businessName ?? "Sandalias HC",
      headerColor: data.headerColor ?? "#cfd500",
    },
  });
}
