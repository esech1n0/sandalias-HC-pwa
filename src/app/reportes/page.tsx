import { getCurrentUser } from "@/lib/auth/dal";
import { Header } from "@/components/Header";
import { ReportViewer } from "@/components/reports/ReportViewer";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
} from "@/services/reports";
import { getNotifications, getUnreadNotificationsCount } from "@/services/notifications";

interface ReportesPageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function ReportesPage({ searchParams }: ReportesPageProps) {
  const user = await getCurrentUser();
  const notifications = await getNotifications();
  const unreadCount = await getUnreadNotificationsCount();

  const resolvedParams = await searchParams;
  const range = (resolvedParams?.range as "daily" | "weekly" | "monthly") || "daily";

  const now = new Date();
  let reportData;
  if (range === "weekly") {
    reportData = await getWeeklyReport(now);
  } else if (range === "monthly") {
    reportData = await getMonthlyReport(now.getFullYear(), now.getMonth());
  } else {
    reportData = await getDailyReport(now);
  }

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
        <ReportViewer initialReport={reportData} period={range} />
      </main>
    </div>
  );
}
