import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { Header } from "@/components/Header";
import { ReportViewer } from "@/components/reports/ReportViewer";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  getCustomReport,
  getAllTimeReport,
} from "@/services/reports";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";
import { parseExpenseDate } from "@/lib/expenses/date";
import { serializeData } from "@/lib/serialize";

interface ReportesPageProps {
  searchParams: Promise<{
    range?: string;
    date?: string;
    year?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ReportesPage({ searchParams }: ReportesPageProps) {
  const user = await getCurrentUser();
  if (user?.username?.toLowerCase() === "empleado") {
    redirect("/ventas");
  }
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationsCount();

  const resolvedParams = await searchParams;
  const range = (resolvedParams?.range as "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all") || "daily";

  const now = new Date();
  const targetYear = resolvedParams?.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();
  const targetMonth = resolvedParams?.month !== undefined ? parseInt(resolvedParams.month, 10) : now.getMonth();
  const targetDate = resolvedParams?.date ? parseExpenseDate(resolvedParams.date) : now;

  let reportData;
  if (range === "weekly") {
    reportData = await getWeeklyReport(targetDate);
  } else if (range === "monthly") {
    reportData = await getMonthlyReport(targetYear, targetMonth);
  } else if (range === "yearly") {
    reportData = await getYearlyReport(targetYear);
  } else if (range === "custom" && resolvedParams?.startDate && resolvedParams?.endDate) {
    reportData = await getCustomReport(
      parseExpenseDate(resolvedParams.startDate),
      parseExpenseDate(resolvedParams.endDate)
    );
  } else if (range === "all") {
    reportData = await getAllTimeReport();
  } else {
    reportData = await getDailyReport(targetDate);
  }

  const serializedReport = serializeData(reportData);

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
        <ReportViewer
          initialReport={serializedReport}
          period={range}
          currentYear={targetYear}
          currentMonth={targetMonth}
          currentDate={resolvedParams?.date || now.toISOString().slice(0, 10)}
          currentStartDate={resolvedParams?.startDate || ""}
          currentEndDate={resolvedParams?.endDate || ""}
        />
      </main>
    </div>
  );
}
