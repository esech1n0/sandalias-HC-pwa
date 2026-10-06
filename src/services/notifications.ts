import "server-only";
import { prisma } from "@/lib/prisma";

export async function triggerLowStockNotification(
  productId: string,
  stock: number,
  minStock: number,
  productName: string
) {
  if (stock >= minStock) return;

  // Evitar notificaciones duplicadas no leídas para el mismo producto
  const existingUnread = await prisma.notification.findFirst({
    where: {
      productId,
      type: "LOW_STOCK",
      isRead: false,
    },
  });

  if (!existingUnread) {
    await prisma.notification.create({
      data: {
        type: "LOW_STOCK",
        title: "Bajo Stock",
        message: `El producto "${productName}" tiene solo ${stock} unidad(es) (Mínimo: ${minStock}).`,
        productId,
        isRead: false,
      },
    });
  }
}

export async function getNotifications(limit: number = 30) {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationsCount() {
  return prisma.notification.count({
    where: { isRead: false },
  });
}

export async function markNotificationAsRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead() {
  return prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}
