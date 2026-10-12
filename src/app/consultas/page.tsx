import { getCurrentUser } from "@/lib/auth/dal";
import { getSalesHistory } from "@/services/sales";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { Header } from "@/components/Header";
import { SalesHistoryViewer } from "@/components/consultas/SalesHistoryViewer";

export default async function ConsultasPage() {
  const user = await getCurrentUser();
  const isEmployee = user?.username?.toLowerCase() === "empleado";
  const sales = await getSalesHistory(50);
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
      <main className="flex-1 flex flex-col overflow-y-auto pb-20 md:pb-0">
        <SalesHistoryViewer
          isEmployee={isEmployee}
          sales={sales.map((s) => ({
            ...s,
            subtotal: Number(s.subtotal),
            discountValue: s.discountValue !== null ? Number(s.discountValue) : null,
            discountAmount: Number(s.discountAmount),
            total: Number(s.total),
            totalCost: isEmployee ? 0 : Number(s.totalCost),
            grossProfit: isEmployee ? 0 : Number(s.grossProfit),
            createdAt: s.createdAt.toISOString(),
            items: isEmployee
              ? []
              : s.items.map((i) => ({
                  ...i,
                  originalPrice: Number(i.originalPrice),
                  unitPrice: Number(i.unitPrice),
                  discountValue: i.discountValue !== null ? Number(i.discountValue) : null,
                  discountAmount: Number(i.discountAmount),
                  unitCost: Number(i.unitCost),
                  subtotal: Number(i.subtotal),
                  totalCost: Number(i.totalCost),
                  profit: Number(i.profit),
                })),
            payments: s.payments.map((p) => ({
              ...p,
              amount: Number(p.amount),
              receivedAmount: p.receivedAmount !== null ? Number(p.receivedAmount) : null,
              changeGiven: p.changeGiven !== null ? Number(p.changeGiven) : null,
            })),
            user: s.user ? { name: s.user.name, username: s.user.username } : null,
          }))}
        />
      </main>
    </div>
  );
}
