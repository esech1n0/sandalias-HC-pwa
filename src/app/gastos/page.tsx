import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getExpenses } from "@/services/expenses";
import { getExpenseCategories } from "@/services/expenseCategories";
import { getScheduledExpenses, checkUpcomingExpensesAlerts } from "@/services/scheduledExpenses";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { Header } from "@/components/Header";
import { ExpenseManager } from "@/components/expenses/ExpenseManager";

export default async function GastosPage() {
  const user = await getCurrentUser();
  if (user?.username?.toLowerCase() === "empleado") {
    redirect("/403");
  }

  // Verificar compromisos próximos a vencer y generar alertas si es necesario
  await checkUpcomingExpensesAlerts().catch(() => null);

  const [expenses, categories, scheduledExpenses, notifications, unreadCount] = await Promise.all([
    getExpenses(100),
    getExpenseCategories(),
    getScheduledExpenses(),
    getNotifications(),
    getUnreadNotificationsCount(),
  ]);

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
        <ExpenseManager
          expenses={expenses.map((e) => ({
            ...e,
            amount: Number(e.amount),
            date: e.date.toISOString(),
            user: e.user ? { name: e.user.name, username: e.user.username } : null,
          }))}
          scheduledExpenses={scheduledExpenses.map((s) => ({
            ...s,
            amount: Number(s.amount),
            dueDate: s.dueDate.toISOString(),
            startDate: s.startDate.toISOString(),
            endDate: s.endDate ? s.endDate.toISOString() : null,
            user: s.user ? { name: s.user.name, username: s.user.username } : null,
            expense: s.expense
              ? {
                  id: s.expense.id,
                  date: s.expense.date.toISOString(),
                  paymentMethod: s.expense.paymentMethod,
                }
              : null,
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </main>
    </div>
  );
}
