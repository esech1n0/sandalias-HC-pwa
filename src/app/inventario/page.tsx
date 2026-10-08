import { getCurrentUser } from "@/lib/auth/dal";
import { getProducts } from "@/services/products";
import { getCategories } from "@/services/categories";
import { getInventoryMovements } from "@/services/inventory";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { Header } from "@/components/Header";
import { InventoryManager } from "@/components/inventory/InventoryManager";

export default async function InventarioPage() {
  const user = await getCurrentUser();
  const isEmployee = user?.username?.toLowerCase() === "empleado";
  const products = await getProducts({ onlyActive: true });
  const categories = await getCategories();
  const movements = isEmployee ? [] : await getInventoryMovements(undefined, 40);
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationsCount();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        userName={user?.name || user?.username || "Administrador"}
        isEmployee={isEmployee}
        notifications={notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
        unreadCount={unreadCount}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <InventoryManager
          isEmployee={isEmployee}
          products={products.map((p) => ({
            ...p,
            salePrice: Number(p.salePrice),
            currentCost: Number(p.currentCost),
            category: p.category,
          }))}
          categories={categories}
          movements={movements.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
            product: m.product ? { name: m.product.name } : undefined,
            user: m.user ? { name: m.user.name, username: m.user.username } : null,
          }))}
        />
      </main>
    </div>
  );
}
