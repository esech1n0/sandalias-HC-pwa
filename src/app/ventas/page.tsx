import { getCurrentUser } from "@/lib/auth/dal";
import { getProducts } from "@/services/products";
import { getCategories } from "@/services/categories";
import { getActiveCashRegister } from "@/services/cash";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { getSystemSettings } from "@/services/settings";
import { Header } from "@/components/Header";
import { PosTerminal } from "@/components/pos/PosTerminal";

export default async function VentasPage() {
  const user = await getCurrentUser();
  const [
    products,
    categories,
    activeRegister,
    notifications,
    unreadCount,
    settings,
  ] = await Promise.all([
    getProducts(),
    getCategories(),
    getActiveCashRegister(),
    getNotifications(),
    getUnreadNotificationsCount(),
    getSystemSettings(),
  ]);

  const isEmployee = user?.username?.toLowerCase() === "empleado";

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
      <main className="flex-1 flex flex-col overflow-hidden">
        <PosTerminal
          products={products.map((p) => ({
            ...p,
            salePrice: Number(p.salePrice),
            currentCost: Number(p.currentCost),
            category: p.category,
          }))}
          categories={categories}
          activeCashRegister={
            activeRegister
              ? {
                  id: activeRegister.id,
                  openingBalance: Number(activeRegister.openingBalance),
                  expectedCash: Number(activeRegister.expectedCash),
                }
              : null
          }
          allowBelowCostSales={settings.allowBelowCostSales}
          cardCommissionEnabled={settings.cardCommissionEnabled}
          defaultCardCommissionRate={Number(settings.cardCommissionPercentage ?? 0)}
        />
      </main>
    </div>
  );
}
