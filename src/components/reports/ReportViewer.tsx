"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Package,
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
  totalWithdrawals: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
}

interface ReportData {
  metrics: FinancialMetrics;
  salesCount: number;
  salesByDay: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  expensesByCategory: { category: string; amount: number }[];
}

interface ReportViewerProps {
  initialReport: ReportData;
  period?: "daily" | "weekly" | "monthly";
}

export function ReportViewer({ initialReport, period = "daily" }: ReportViewerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const data = initialReport;
  const { metrics } = data;

  const handlePeriodChange = (newPeriod: "daily" | "weekly" | "monthly") => {
    startTransition(() => {
      router.push(`/reportes?range=${newPeriod}`);
    });
  };

  // Encontrar el valor máximo para escalar barras de gráficas adaptativas (Sección 36)
  const maxDaySale = Math.max(
    ...data.salesByDay.map((d) => d.total),
    100
  );

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#cfd500]" />
            Reportes Financieros y Métricas
          </h1>
          <p className="text-sm text-slate-500">
            Diferenciación estricta entre ventas, costos, gastos, retiros y ganancia neta
          </p>
        </div>

        {/* Selector de Periodo */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handlePeriodChange("daily")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === "daily" ? "bg-black text-[#cfd500]" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => handlePeriodChange("weekly")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === "weekly" ? "bg-black text-[#cfd500]" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => handlePeriodChange("monthly")}
            disabled={isPending}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === "monthly" ? "bg-black text-[#cfd500]" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Este Mes
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Brutas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Venta Bruta</div>
          <div className="font-black text-2xl text-slate-900 dark:text-white mt-1">
            {formatCurrency(metrics.totalSales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {data.salesCount} venta(s) registradas
          </div>
        </div>

        {/* Costo de Mercancía Vendida */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Costo de Mercancía (COGS)</div>
          <div className="font-black text-2xl text-slate-700 dark:text-slate-300 mt-1">
            {formatCurrency(metrics.totalCostOfGoodsSold)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Histórico según promedio ponderado
          </div>
        </div>

        {/* Ganancia Bruta */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Ganancia Bruta</div>
          <div className="font-black text-2xl text-emerald-600 mt-1">
            {formatCurrency(metrics.grossProfit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Venta menos costo de mercancía
          </div>
        </div>

        {/* Ganancia Neta */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            metrics.isNetLoss
              ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
          }`}
        >
          <div className="text-xs font-bold uppercase flex items-center justify-between">
            <span className={metrics.isNetLoss ? "text-red-700" : "text-emerald-700"}>
              {metrics.isNetLoss ? "Pérdida Neta" : "Ganancia Neta"}
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
            Menos gastos operativos ({formatCurrency(metrics.totalExpenses)})
          </div>
        </div>
      </div>

      {/* Retiros vs Gastos (Separación Explícita según Sección 30) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gastos del Negocio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
              Gastos del Negocio ({formatCurrency(metrics.totalExpenses)})
            </h3>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">
              Afectan Utilidad
            </span>
          </div>
          {data.expensesByCategory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No hay gastos registrados en el periodo.
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
          Ingresos por Método de Pago
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

      {/* Gráfica de Ventas y Productos Más Vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Ventas por Día con escala adaptativa */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-4">
            Ventas por Día
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
              No hay datos suficientes aún.
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
