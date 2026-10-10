import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { Header } from "@/components/Header";
import { SettingsManager } from "@/components/configuracion/SettingsManager";
import { getSystemSettings } from "@/services/settings";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (user?.username?.toLowerCase() === "empleado") {
    redirect("/ventas");
  }
  const settings = await getSystemSettings();
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationsCount();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        userName={user?.name || user?.username || "Administrador"}
        notifications={notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
        unreadCount={unreadCount}
      />
      <main className="flex-1 flex flex-col overflow-y-auto pb-20 md:pb-0">
        <SettingsManager
          initialSettings={{
            id: settings.id,
            allowBelowCostSales: settings.allowBelowCostSales,
            defaultMinStock: settings.defaultMinStock,
            businessName: settings.businessName,
            headerColor: settings.headerColor,
          }}
          currentUser={{
            username: user?.username || "admin",
            name: user?.name,
          }}
        />
      </main>
    </div>
  );
}
