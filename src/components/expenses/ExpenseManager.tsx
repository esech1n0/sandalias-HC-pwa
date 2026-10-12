"use client";

import { useState } from "react";
import { ReceiptText, Plus, AlertCircle, CheckCircle2, Sparkles, Calendar, Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { createExpenseAction, updateExpenseAction } from "@/actions/expenses";
import { getTodayDateString, dateToInputString, formatDisplayDate } from "@/lib/expenses/date";

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

interface ExpenseCategoryItem {
  id: string;
  name: string;
}

interface ExpenseManagerProps {
  expenses: ExpenseItem[];
  categories?: ExpenseCategoryItem[];
}

const DEFAULT_CATEGORIES = [
  "Renta",
  "Servicios (Luz / Agua)",
  "Sueldos",
  "Transporte",
  "Mantenimiento",
];

const categoryLabels: Record<string, string> = {
  RENT: "Renta",
  UTILITIES: "Servicios (Luz / Agua)",
  SALARY: "Sueldos",
  TRANSPORT: "Transporte",
  MAINTENANCE: "Mantenimiento",
  OTHER: "Otros Gastos",
};

export function ExpenseManager({ expenses, categories = [] }: ExpenseManagerProps) {
  // Combinar categorías fijas y personalizadas de la BD
  const availableCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...categories.map((c) => c.name),
    ])
  );

  // Estados para Registro de Gasto
  const [date, setDate] = useState(getTodayDateString());
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState(availableCategories[0] || "Servicios (Luz / Agua)");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Edición de Gasto
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editConcept, setEditConcept] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editDescription, setEditDescription] = useState("");
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const isOther = category === "OTHER" || category === "Otros";
  const isEditOther = editCategory === "OTHER" || editCategory === "Otros";

  const handleOpenEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setEditDate(dateToInputString(expense.date));
    setEditConcept(expense.concept);
    setEditCategory(expense.category);
    setEditAmount(String(expense.amount));
    setEditPaymentMethod(expense.paymentMethod || "CASH");
    setEditDescription(expense.description || "");
    setEditCustomCategory("");
  };

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
      setDate(getTodayDateString());
      setConcept("");
      setAmount("");
      setDescription("");
      setCustomCategory("");
      if (isOther) {
        setCategory(availableCategories[0] || "Servicios (Luz / Agua)");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar gasto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;
    setIsEditingSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateExpenseAction(editingExpense.id, formData);
      setEditingExpense(null);
      setFeedback({
        type: "success",
        message: "Gasto actualizado exitosamente.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar gasto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsEditingSubmitting(false);
    }
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
            {/* Campo: Fecha del Gasto (Ubicado antes del campo Concepto) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#cfd500]" />
                Fecha del Gasto *
              </label>
              <input
                name="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold text-xs text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
              />
            </div>

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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
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
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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

            {/* Cuadro de texto para nueva categoría si se selecciona 'Otros' */}
            {isOther && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5 transition-all animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#9da101]" />
                  <span>Nueva Categoría de Gasto</span>
                </div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Nombre del gasto / categoría *
                </label>
                <input
                  name="customCategory"
                  type="text"
                  required
                  placeholder="Ej. Papelería, Publicidad, Insumos..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#9da101] rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#9da101]"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-400">
                  Esta categoría se guardará en la base de datos para futuros registros.
                </p>
              </div>
            )}

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
              className="w-full py-3 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
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
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No hay gastos registrados.
                      </td>
                    </tr>
                  ) : (
                    expenses.slice(0, 15).map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {formatDisplayDate(e.date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {e.concept}
                          {e.description && (
                            <span className="block text-[10px] font-normal text-slate-400 truncate max-w-xs">
                              {e.description}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {categoryLabels[e.category] || e.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-red-500 whitespace-nowrap">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 whitespace-nowrap">
                            {e.paymentMethod === "CASH" ? "Efectivo" : e.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(e)}
                            title="Editar gasto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Editar Gasto */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-[#cfd500]" />
                <h3 className="font-black text-base">Editar Gasto</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              {/* Campo: Fecha del Gasto (Ubicado antes del campo Concepto) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#cfd500]" />
                  Fecha del Gasto *
                </label>
                <input
                  name="date"
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold text-xs text-slate-800 dark:text-slate-100 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Concepto *
                </label>
                <input
                  name="concept"
                  type="text"
                  required
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Categoría *
                  </label>
                  <select
                    name="category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-black text-sm text-red-500"
                  />
                </div>
              </div>

              {isEditOther && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-[#9da101]" />
                    <span>Nueva Categoría de Gasto</span>
                  </div>
                  <input
                    name="customCategory"
                    type="text"
                    required
                    placeholder="Ej. Papelería, Publicidad..."
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#9da101] rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#9da101]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Método de Pago *
                </label>
                <select
                  name="paymentMethod"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                >
                  <option value="CASH">Efectivo (Caja)</option>
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
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="flex-1 py-2.5 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  {isEditingSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
