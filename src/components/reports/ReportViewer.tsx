"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";

interface FinancialMetrics {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  isNetLoss: boolean;
  netLossAmount: number;
  pendingCommitments: number;
  projectedNetProfit: number;
  isProjectedLoss: boolean;
  projectedLossAmount: number;
  totalWithdrawals: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

interface AllTimeSummary {
  totalSales: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  isNetLoss: boolean;
  pendingCommitments: number;
  projectedNetProfit: number;
  salesCount: number;
  topExpenseCategories: { category: string; amount: number }[];
}

interface MonthlyBreakdownItem {
  month: number;
  monthName: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  pendingCommitments: number;
  projectedNetProfit: number;
}

interface PendingExpenseItem {
  id: string;
  concept: string;
  category: string;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  frequency: string | null;
  status: string;
  notes: string | null;
}

interface ReportData {
  metrics: FinancialMetrics;
  salesCount: number;
  salesByDay: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  expensesByCategory: { category: string; amount: number }[];
  pendingScheduledExpenses?: PendingExpenseItem[];
  allTimeSummary: AllTimeSummary;
  availableYears: number[];
  yearlyBreakdown?: MonthlyBreakdownItem[];
}

interface ReportViewerProps {
  initialReport: ReportData;
  period?: "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all";
  currentYear: number;
  currentMonth: number;
  currentDate: string;
  currentStartDate: string;
  currentEndDate: string;
}

const MONTHS_LIST = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function ReportViewer({
  initialReport,
  period = "daily",
  currentYear,
  currentMonth,
  currentDate,
  currentStartDate,
  currentEndDate,
}: ReportViewerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const data = initialReport;
  const { metrics, allTimeSummary, yearlyBreakdown } = data;

  // Estados locales para filtros personalizados
  const [customStart, setCustomStart] = useState(currentStartDate || new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState(currentEndDate || new Date().toISOString().slice(0, 10));
  const [selectedDay, setSelectedDay] = useState(currentDate || new Date().toISOString().slice(0, 10));
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const navigateTo = (params: Record<string, string | number>) => {
    startTransition(() => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") sp.set(k, String(v));
      });
      router.push(`/reportes?${sp.toString()}`);
    });
  };

  const handlePeriodChange = (newPeriod: "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all") => {
    if (newPeriod === "daily") {
      navigateTo({ range: "daily", date: selectedDay });
    } else if (newPeriod === "weekly") {
      navigateTo({ range: "weekly", date: selectedDay });
    } else if (newPeriod === "monthly") {
      navigateTo({ range: "monthly", year: selectedYear, month: selectedMonth });
    } else if (newPeriod === "yearly") {
      navigateTo({ range: "yearly", year: selectedYear });
    } else if (newPeriod === "custom") {
      navigateTo({ range: "custom", startDate: customStart, endDate: customEnd });
    } else if (newPeriod === "all") {
      navigateTo({ range: "all" });
    }
  };

  // Comparación periodo vs acumulado
  const salesSharePercent =
    allTimeSummary.totalSales > 0
      ? Math.round((metrics.totalSales / allTimeSummary.totalSales) * 100)
      : 0;

  const maxDaySale = Math.max(...data.salesByDay.map((d) => d.total), 100);
  const maxYearMonthVal = yearlyBreakdown
    ? Math.max(...yearlyBreakdown.map((m) => Math.max(m.sales, m.expenses, Math.abs(m.netProfit))), 100)
    : 100;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* ==================================================================== */}
      {/* Encabezado y Selector de Periodos */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#cfd500]" />
            Reportes Financieros y Métricas
          </h1>
          <p className="text-sm text-slate-500">
            Diferenciación estricta: ventas, costos, gastos reales pagados, compromisos programados y utilidad histórica
          </p>
        </div>

        {/* Selector de Pestañas de Periodo */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {[
            { id: "daily", label: "Día" },
            { id: "weekly", label: "Semana" },
            { id: "monthly", label: "Mes" },
            { id: "yearly", label: "Año" },
            { id: "custom", label: "Personalizado" },
            { id: "all", label: "Acumulado" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handlePeriodChange(tab.id as typeof period)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                period === tab.id
                  ? "bg-black text-[#cfd500] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Filtros Contextuales según el periodo seleccionado */}
      {/* ==================================================================== */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {period === "daily" && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase">Fecha:</span>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value);
                navigateTo({ range: "daily", date: e.target.value });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            />
          </div>
        )}

        {period === "weekly" && (
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase">Semana correspondiente al día:</span>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value);
                navigateTo({ range: "weekly", date: e.target.value });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            />
          </div>
        )}

        {period === "monthly" && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Mes:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                setSelectedMonth(m);
                navigateTo({ range: "monthly", year: selectedYear, month: m });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            >
              {MONTHS_LIST.map((mName, idx) => (
                <option key={mName} value={idx}>
                  {mName}
                </option>
              ))}
            </select>

            <span className="text-xs font-bold text-slate-500 uppercase ml-2">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                navigateTo({ range: "monthly", year: y, month: selectedMonth });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            >
              {data.availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {period === "yearly" && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Año a Consultar:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                navigateTo({ range: "yearly", year: y });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
            >
              {data.availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              (El cambio de año conserva íntegramente todos los registros anteriores)
            </span>
          </div>
        )}

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Desde:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Hasta:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              />
            </div>
            <button
              onClick={() => navigateTo({ range: "custom", startDate: customStart, endDate: customEnd })}
              className="px-4 py-1.5 rounded-xl font-bold text-xs bg-black text-[#cfd500] hover:brightness-125 transition-all cursor-pointer"
            >
              Aplicar Rango
            </button>
          </div>
        )}

        {period === "all" && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <History className="w-4 h-4 text-[#cfd500]" />
            <span>Mostrando todo el historial financiero registrado desde el inicio de operaciones</span>
          </div>
        )}

        {/* Indicador de carga sutil */}
        {isPending && (
          <div className="text-xs font-bold text-amber-600 animate-pulse">
            Actualizando reporte...
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Tarjetas Principales del Periodo Seleccionado */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Venta Bruta */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Ingresos por Ventas</div>
          <div className="font-black text-2xl text-slate-900 dark:text-white mt-1">
            {formatCurrency(metrics.totalSales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.salesCount} venta(s) en este periodo
          </div>
        </div>

        {/* Costo de Mercancía Vendida (COGS) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Costo Mercancía (COGS)</div>
          <div className="font-black text-2xl text-slate-700 dark:text-slate-300 mt-1">
            {formatCurrency(metrics.totalCostOfGoodsSold)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Costo de adquisición ponderado
          </div>
        </div>

        {/* Ganancia Bruta */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Ganancia Bruta</div>
          <div className="font-black text-2xl text-emerald-600 mt-1">
            {formatCurrency(metrics.grossProfit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Ventas menos costo de mercancía
          </div>
        </div>

        {/* Ganancia Neta Real */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            metrics.isNetLoss
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
          }`}
        >
          <div className="text-xs font-bold uppercase flex items-center justify-between">
            <span className={metrics.isNetLoss ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
              {metrics.isNetLoss ? "Pérdida Neta Real" : "Utilidad Neta Real"}
            </span>
            {metrics.isNetLoss ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div
            className={`font-black text-2xl mt-1 ${
              metrics.isNetLoss ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {formatCurrency(metrics.netProfit)}
          </div>
          <div className="text-[11px] opacity-75 mt-1">
            Menos gastos pagados ({formatCurrency(metrics.totalExpenses)})
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Diferenciación: Compromisos Programados y Proyección Financiera */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-transparent border border-amber-300 dark:border-amber-900/60 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Compromisos Programados vs Utilidad Proyectada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los gastos programados se muestran por separado y NO descuentan dinero de la utilidad hasta que se confirman como pagados.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Compromisos Pendientes</div>
              <div className="font-black text-lg text-amber-600">
                {formatCurrency(metrics.pendingCommitments)}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Resultado Proyectado</div>
              <div
                className={`font-black text-lg ${
                  metrics.isProjectedLoss ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {formatCurrency(metrics.projectedNetProfit)}
              </div>
            </div>
          </div>
        </div>

        {/* Desglose de Compromisos Pendientes en el periodo */}
        {data.pendingScheduledExpenses && data.pendingScheduledExpenses.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
              Obligaciones programadas pendientes de pago en este periodo:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {data.pendingScheduledExpenses.map((p) => {
                const due = new Date(p.dueDate);
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.concept}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.category} · Vence: {due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <div className="font-black text-amber-600 text-sm">
                      {formatCurrency(p.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic mt-1">
            No existen compromisos de gastos programados pendientes en este periodo seleccionado.
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Sección 3.5: Vista Anual y Evolución del Negocio (si está en "yearly") */}
      {/* ==================================================================== */}
      {period === "yearly" && yearlyBreakdown && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-black text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#cfd500]" />
                Evolución Anual del Negocio ({selectedYear})
              </h3>
              <p className="text-xs text-slate-500">
                Comparativa mensual de ingresos, gastos y ganancia neta para identificar tendencias
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Acumulado Anual:{" "}
              <span className="font-black text-emerald-600">
                {formatCurrency(metrics.netProfit)}
              </span>
            </div>
          </div>

          {/* Gráfica de Barras Mensuales Adaptativa */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase">
              {yearlyBreakdown.map((m) => (
                <div key={m.month}>{m.monthName}</div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-2 h-44 items-end bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              {yearlyBreakdown.map((m) => {
                const salesHeight = Math.max(4, Math.round((m.sales / maxYearMonthVal) * 100));
                const expensesHeight = Math.max(4, Math.round((m.expenses / maxYearMonthVal) * 100));

                return (
                  <div key={m.month} className="h-full flex items-end justify-center gap-1 group relative">
                    {/* Barra de Ventas */}
                    <div
                      style={{ height: `${salesHeight}%`, backgroundColor: "#cfd500" }}
                      className="w-2.5 sm:w-3.5 rounded-t-sm transition-all group-hover:brightness-110"
                      title={`${m.monthName} Ventas: ${formatCurrency(m.sales)}`}
                    />
                    {/* Barra de Gastos */}
                    <div
                      style={{ height: `${expensesHeight}%` }}
                      className="w-2.5 sm:w-3.5 rounded-t-sm bg-red-400 dark:bg-red-500 transition-all group-hover:brightness-110"
                      title={`${m.monthName} Gastos: ${formatCurrency(m.expenses)}`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: "#cfd500" }} />
                <span>Ingresos por Ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-red-400" />
                <span>Gastos Pagados</span>
              </div>
            </div>
          </div>

          {/* Tabla de Detalle Mes a Mes */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Mes</th>
                  <th className="py-2 px-3 text-right">Ventas</th>
                  <th className="py-2 px-3 text-right">Costo Mercancía</th>
                  <th className="py-2 px-3 text-right">Gastos Pagados</th>
                  <th className="py-2 px-3 text-right">Utilidad Neta</th>
                  <th className="py-2 px-3 text-right">Compromisos Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {yearlyBreakdown.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {MONTHS_LIST[m.month]}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 dark:text-slate-100">
                      {formatCurrency(m.sales)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {formatCurrency(m.cogs)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-500 font-bold">
                      {formatCurrency(m.expenses)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-black ${
                        m.netProfit < 0 ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(m.netProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600">
                      {m.pendingCommitments > 0 ? formatCurrency(m.pendingCommitments) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Sección 3.2: Resumen Financiero Histórico Acumulado (All-Time) */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
              Resumen Financiero Acumulado Histórico (Desde el inicio)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Total de ventas registradas: {allTimeSummary.salesCount}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Ventas Acumuladas</span>
            <div className="font-black text-lg text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(allTimeSummary.totalSales)}
            </div>
            {period !== "all" && (
              <div className="text-[10px] text-slate-500 mt-1">
                Este periodo representa el {salesSharePercent}% del acumulado
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Costos Acumulados</span>
            <div className="font-black text-lg text-slate-700 dark:text-slate-300 mt-0.5">
              {formatCurrency(allTimeSummary.totalCostOfGoodsSold)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Costo total de adquisición</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Gastos Pagados Acumulados</span>
            <div className="font-black text-lg text-red-500 mt-0.5">
              {formatCurrency(allTimeSummary.totalExpenses)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Costos operativos históricos</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Ganancia Neta Acumulada</span>
            <div
              className={`font-black text-lg mt-0.5 ${
                allTimeSummary.isNetLoss ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {formatCurrency(allTimeSummary.netProfit)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Beneficio neto histórico total</div>
          </div>
        </div>

        {/* Desglose de Gastos que más generan costos */}
        {allTimeSummary.topExpenseCategories.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
              Conceptos que más gastos generan en el negocio:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {allTimeSummary.topExpenseCategories.slice(0, 3).map((c, i) => (
                <div
                  key={c.category}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] flex items-center justify-center">
                      #{i + 1}
                    </span>
                    <span className="font-bold">{c.category}</span>
                  </div>
                  <span className="font-black text-red-500">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Desglose Operativo: Retiros vs Gastos y Métodos de Pago */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gastos del Negocio en el Periodo */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
              Gastos del Periodo ({formatCurrency(metrics.totalExpenses)})
            </h3>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">
              Afectan Utilidad
            </span>
          </div>
          {data.expensesByCategory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No hay gastos pagados en este periodo.
            </div>
          ) : (
            <div className="space-y-2">
              {data.expensesByCategory.map((c) => (
                <div key={c.category} className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">{c.category}</span>
                  <span className="font-bold text-red-500">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Retiros de Caja */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-amber-500" />
              Retiros de Efectivo ({formatCurrency(metrics.totalWithdrawals)})
            </h3>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
              NO Afectan Utilidad
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Los retiros disminuyen el saldo de efectivo físico en caja, pero no representan un costo operativo del negocio. Por regla contable, se mantienen estrictamente independientes de las pérdidas y ganancias.
          </p>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-3">
          Ingresos por Método de Pago en el Periodo
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-400">Efectivo en Caja</span>
            <div className="font-black text-lg text-emerald-600 mt-1">
              {formatCurrency(metrics.cashSales)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-400">Tarjeta (Banco)</span>
            <div className="font-black text-lg text-blue-500 mt-1">
              {formatCurrency(metrics.cardSales)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-400">Transferencia (Banco)</span>
            <div className="font-black text-lg text-purple-500 mt-1">
              {formatCurrency(metrics.transferSales)}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Gráfica Diaria y Productos Más Vendidos */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Ventas Diarias */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-4">
            Ventas por Día en el Periodo
          </h3>
          {data.salesByDay.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay ventas en las fechas seleccionadas.
            </div>
          ) : (
            <div className="space-y-3">
              {data.salesByDay.map((d) => {
                const percent = Math.min(100, Math.round((d.total / maxDaySale) * 100));
                return (
                  <div key={d.date} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-slate-500">{d.date}</span>
                      <span className="font-bold">{formatCurrency(d.total)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: "#cfd500",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Productos Más Vendidos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#cfd500]" />
            Productos Más Vendidos
          </h3>
          {data.topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay datos de ventas en este periodo.
            </div>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-[#cfd500] font-black flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black">{p.quantity} pzas</div>
                    <div className="text-[10px] text-slate-400">{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
