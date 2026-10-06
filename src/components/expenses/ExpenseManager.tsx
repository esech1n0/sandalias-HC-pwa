"use client";

import { useState } from "react";
import { ReceiptText, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { createExpenseAction } from "@/actions/expenses";

interface ExpenseItem {
  id: string;
  concept: string;
  category: string;
  amount: number | string;
  date: string | Date;
  paymentMethod: string;
  description?: string | null;
  user?: { name: string; username: string } | null;
}

interface ExpenseManagerProps {
  expenses: ExpenseItem[];
}

export function ExpenseManager({ expenses }: ExpenseManagerProps) {
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("UTILITIES");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createExpenseAction(formData);
      setFeedback({
        type: "success",
        message: "Gasto registrado exitosamente. Ha sido integrado a los cálculos de utilidad neta.",
      });
      setConcept("");
      setAmount("");
      setDescription("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar gasto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    RENT: "Renta",
    UTILITIES: "Servicios (Luz / Agua)",
    SALARY: "Sueldos",
    TRANSPORT: "Transporte",
    MAINTENANCE: "Mantenimiento",
    OTHER: "Otros Gastos",
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ReceiptText className="w-7 h-7 text-[#cfd500]" />
          Gastos del Negocio
        </h1>
        <p className="text-sm text-slate-500">
          Registro de costos operativos reales (afectan directamente la ganancia neta)
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Formulario de Registro */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-base font-black flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-emerald-600" />
            Registrar Nuevo Gasto
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Concepto *
              </label>
              <input
                name="concept"
                type="text"
                required
                placeholder="Ej. Recibo de luz CFE, renta local..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                >
                  <option value="RENT">Renta</option>
                  <option value="UTILITIES">Servicios (Luz / Agua)</option>
                  <option value="SALARY">Sueldos</option>
                  <option value="TRANSPORT">Transporte</option>
                  <option value="MAINTENANCE">Mantenimiento</option>
                  <option value="OTHER">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Monto ($) *
                </label>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-black text-sm text-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Método de Pago *
              </label>
              <select
                name="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
              >
                <option value="CASH">Efectivo (Descuenta de Caja Abierta)</option>
                <option value="CARD">Tarjeta (Banco)</option>
                <option value="TRANSFER">Transferencia (Banco)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Descripción / Referencia
              </label>
              <input
                name="description"
                type="text"
                placeholder="Detalles adicionales..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105 transition-all disabled:opacity-50"
              style={{ backgroundColor: "#cfd500" }}
            >
              {isSubmitting ? "Guardando..." : "Guardar Gasto"}
            </button>
          </form>
        </div>

        {/* Resumen de Gastos */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-black mb-3">Historial Reciente de Gastos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Concepto</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Monto</th>
                    <th className="py-2.5 px-3">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No hay gastos registrados.
                      </td>
                    </tr>
                  ) : (
                    expenses.slice(0, 15).map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {new Date(e.date).toLocaleDateString("es-MX")}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {e.concept}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {categoryLabels[e.category] || e.category}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-red-500">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {e.paymentMethod === "CASH" ? "Efectivo" : e.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}
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
      </div>
    </div>
  );
}
