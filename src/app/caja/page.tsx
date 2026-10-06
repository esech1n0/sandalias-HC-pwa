import { getCurrentUser } from "@/lib/auth/dal";
import { getActiveCashRegister, getCashRegistersHistory } from "@/services/cash";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { Header } from "@/components/Header";
import { CashManager } from "@/components/cash/CashManager";

export default async function CajaPage() {
  const user = await getCurrentUser();
  const activeRegister = await getActiveCashRegister();
  const history = await getCashRegistersHistory(30);
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
      <main className="flex-1 flex flex-col overflow-y-auto">
        <CashManager
          activeRegister={
            activeRegister
              ? {
                  id: activeRegister.id,
                  status: activeRegister.status,
                  openedAt: activeRegister.openedAt.toISOString(),
                  openingBalance: Number(activeRegister.openingBalance),
                  cashSales: Number(activeRegister.cashSales),
                  cardSales: Number(activeRegister.cardSales),
                  transferSales: Number(activeRegister.transferSales),
                  withdrawalsTotal: Number(activeRegister.withdrawalsTotal),
                  expensesCashTotal: Number(activeRegister.expensesCashTotal),
                  expectedCash: Number(activeRegister.expectedCash),
                  countedCash:
                    activeRegister.countedCash !== null
                      ? Number(activeRegister.countedCash)
                      : null,
                  difference:
                    activeRegister.difference !== null
                      ? Number(activeRegister.difference)
                      : null,
                  movements: activeRegister.movements?.map((m) => ({
                    id: m.id,
                    type: m.type,
                    amount: Number(m.amount),
                    reason: m.reason,
                    createdAt: m.createdAt.toISOString(),
                  })),
                }
              : null
          }
          history={history.map((h) => ({
            id: h.id,
            status: h.status,
            openedAt: h.openedAt.toISOString(),
            closedAt: h.closedAt ? h.closedAt.toISOString() : null,
            openingBalance: Number(h.openingBalance),
            cashSales: Number(h.cashSales),
            withdrawalsTotal: Number(h.withdrawalsTotal),
            expectedCash: Number(h.expectedCash),
            countedCash: h.countedCash !== null ? Number(h.countedCash) : null,
            difference: h.difference !== null ? Number(h.difference) : null,
          }))}
        />
      </main>
    </div>
  );
}
