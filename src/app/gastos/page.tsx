import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getExpenses } from "@/services/expenses";
import { getExpenseCategories } from "@/services/expenseCategories";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { Header } from "@/components/Header";
import { ExpenseManager } from "@/components/expenses/ExpenseManager";

export default async function GastosPage() {
  const user = await getCurrentUser();
  if (user?.username?.toLowerCase() === "empleado") {
    redirect("/403");
  }
  const expenses = await getExpenses(50);
  const categories = await getExpenseCategories();
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
        <ExpenseManager
          expenses={expenses.map((e) => ({
            ...e,
            amount: Number(e.amount),
            date: e.date.toISOString(),
            user: e.user ? { name: e.user.name, username: e.user.username } : null,
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </main>
    </div>
  );
}
