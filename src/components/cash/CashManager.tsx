"use client";

import { useState } from "react";
import {
  Vault,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  History,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { calculateCashRegister } from "@/lib/cash/register";
import {
  openCashRegisterAction,
  createWithdrawalAction,
  closeCashRegisterAction,
} from "@/actions/cash";

export interface ActiveRegisterData {
  id: string;
  openingBalance: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  withdrawalsTotal: number;
  expensesCashTotal: number;
  expectedCash: number;
  countedCash?: number | null;
  difference?: number | null;
  openedAt: string | Date;
  status: string;
  movements?: Array<{
    id: string;
    type: string;
    amount: number;
    reason?: string | null;
    createdAt: string | Date;
  }>;
}

export interface RegisterHistoryItem {
  id: string;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  openingBalance: number;
  cashSales: number;
  withdrawalsTotal: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  status: string;
}

interface CashManagerProps {
  activeRegister: ActiveRegisterData | null;
  history: RegisterHistoryItem[];
}

export function CashManager({ activeRegister, history }: CashManagerProps) {
  const [openingBalance, setOpeningBalance] = useState("1000");

  // Retiro
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");

  // Corte
  const [countedCash, setCountedCash] = useState("");
  const [corteNotes, setCorteNotes] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await openCashRegisterAction(parseFloat(openingBalance));
      setFeedback({ type: "success", message: "Caja abierta con éxito." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al abrir caja";
      setFeedback({ type: "error", message: msg });
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    setFeedback(null);
    try {
      await createWithdrawalAction(
        activeRegister.id,
        parseFloat(withdrawalAmount),
        withdrawalReason
      );
      setFeedback({
        type: "success",
        message: "Retiro de efectivo registrado con éxito. Nota: Los retiros no afectan la utilidad neta.",
      });
      setWithdrawalAmount("");
      setWithdrawalReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar retiro";
      setFeedback({ type: "error", message: msg });
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    setFeedback(null);
    try {
      await closeCashRegisterAction(
        activeRegister.id,
        parseFloat(countedCash),
        corteNotes
      );
      setFeedback({ type: "success", message: "Caja cerrada y corte diario generado exitosamente." });
      setCountedCash("");
      setCorteNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cerrar caja";
      setFeedback({ type: "error", message: msg });
    }
  };

  // Cálculo en vivo del corte si hay caja abierta
  const liveCorte = activeRegister
    ? calculateCashRegister({
        openingBalance: Number(activeRegister.openingBalance),
        cashSales: Number(activeRegister.cashSales),
        cardSales: Number(activeRegister.cardSales),
        transferSales: Number(activeRegister.transferSales),
        withdrawalsTotal: Number(activeRegister.withdrawalsTotal),
        expensesCashTotal: Number(activeRegister.expensesCashTotal),
        countedCash: countedCash ? parseFloat(countedCash) : null,
      })
    : null;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Vault className="w-7 h-7 text-[#cfd500]" />
          Control de Caja y Retiros
        </h1>
        <p className="text-sm text-slate-500">
          Supervisión de efectivo físico, retiros independientes y cuadre de corte diario
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Estado Actual de Caja */}
      {!activeRegister ? (
        // Caja Cerrada
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-md mb-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xl mb-3">
            <Lock className="w-6 h-6 text-slate-400" />
          </div>
          <h2 className="text-lg font-black mb-1">No hay caja abierta</h2>
          <p className="text-xs text-slate-500 mb-4">
            Ingresa el fondo inicial para abrir la jornada operativa.
          </p>
          <form onSubmit={handleOpen} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fondo Inicial ($)
              </label>
              <input
                type="number"
                step="any"
                required
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-black text-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105"
              style={{ backgroundColor: "#cfd500" }}
            >
              Abrir Caja
            </button>
          </form>
        </div>
      ) : (
        // Caja Abierta
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tarjeta de Resumen en Vivo */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase">
                  Caja Abierta
                </span>
                <div className="text-xs text-slate-400 mt-1">
                  Aperturada: {new Date(activeRegister.openedAt).toLocaleTimeString("es-MX")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Efectivo Esperado en Caja</div>
                <div className="font-black text-2xl text-slate-900 dark:text-white">
                  {formatCurrency(liveCorte?.expectedCash)}
                </div>
              </div>
            </div>

            {/* Desglose de Operaciones */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-400">Fondo Inicial</div>
                <div className="font-bold text-sm mt-0.5">
                  {formatCurrency(liveCorte?.openingBalance)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-400">Ventas Efectivo</div>
                <div className="font-bold text-sm text-emerald-600 mt-0.5">
                  +{formatCurrency(liveCorte?.cashSales)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-400">Retiros de Caja</div>
                <div className="font-bold text-sm text-amber-600 mt-0.5">
                  -{formatCurrency(liveCorte?.withdrawalsTotal)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="text-slate-400">Gastos Efectivo</div>
                <div className="font-bold text-sm text-red-500 mt-0.5">
                  -{formatCurrency(liveCorte?.expensesCashTotal)}
                </div>
              </div>
            </div>

            {/* Tarjeta y Transferencia (Fuera del efectivo de caja) */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-slate-400">Ventas Tarjeta (Banco): </span>
                <span className="font-bold">{formatCurrency(liveCorte?.cardSales)}</span>
              </div>
              <div>
                <span className="text-slate-400">Ventas Transferencia (Banco): </span>
                <span className="font-bold">{formatCurrency(liveCorte?.transferSales)}</span>
              </div>
            </div>

            {/* Formulario de Corte Diario */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-sm mb-3">Realizar Corte Diario de Caja</h3>
              <form onSubmit={handleClose} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Efectivo Contado Real *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-black text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Notas de Corte (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Observaciones..."
                    value={corteNotes}
                    onChange={(e) => setCorteNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105"
                    style={{ backgroundColor: "#cfd500" }}
                  >
                    Confirmar Corte y Cerrar
                  </button>
                </div>
              </form>

              {liveCorte && liveCorte.difference !== null && (
                <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between text-xs font-bold">
                  <span>Diferencia de Cuadre:</span>
                  <span
                    className={
                      liveCorte.difference === 0
                        ? "text-emerald-600"
                        : liveCorte.difference > 0
                        ? "text-blue-500"
                        : "text-red-500"
                    }
                  >
                    {liveCorte.difference === 0
                      ? "Cuadre Exacto ($0.00)"
                      : liveCorte.difference > 0
                      ? `Sobrante: +${formatCurrency(liveCorte.difference)}`
                      : `Faltante: ${formatCurrency(liveCorte.difference)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Formulario de Retiro de Caja */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="font-black text-base flex items-center gap-1.5">
                <ArrowUpRight className="w-5 h-5 text-amber-500" />
                Registrar Retiro
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Regla fundamental: El retiro reduce el efectivo de caja, pero NO disminuye la utilidad neta del negocio.
              </p>
            </div>

            <form onSubmit={handleWithdrawal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Monto a Retirar ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Ej. 500.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Motivo del Retiro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Retiro del dueño, depósito personal..."
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-black text-slate-900 text-xs bg-amber-300 hover:bg-amber-400 transition-colors shadow-xs"
              >
                Registrar Retiro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Cortes de Caja */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-base font-black mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          Historial de Cortes de Caja
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase">
                <th className="py-2.5 px-3">Fecha Apertura</th>
                <th className="py-2.5 px-3">Fecha Cierre</th>
                <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                <th className="py-2.5 px-3 text-right">Retiros</th>
                <th className="py-2.5 px-3 text-right">Esperado</th>
                <th className="py-2.5 px-3 text-right">Contado</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No hay registros de caja históricos.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {new Date(h.openedAt).toLocaleString("es-MX")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {h.closedAt ? new Date(h.closedAt).toLocaleString("es-MX") : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(h.openingBalance)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {formatCurrency(h.cashSales)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600">
                      {formatCurrency(h.withdrawalsTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {formatCurrency(h.expectedCash)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {h.countedCash !== null ? formatCurrency(h.countedCash) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {h.difference !== null && h.difference !== undefined ? (
                        <span
                          className={
                            h.difference === 0
                              ? "text-slate-400"
                              : h.difference > 0
                              ? "text-blue-500"
                              : "text-red-500"
                          }
                        >
                          {formatCurrency(h.difference)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          h.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {h.status === "OPEN" ? "Abierta" : "Cerrada"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
