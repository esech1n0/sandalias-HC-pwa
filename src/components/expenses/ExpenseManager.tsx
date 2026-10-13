"use client";

import { useState } from "react";
import {
  ReceiptText,
  Plus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Calendar,
  Pencil,
  X,
  Clock,
  Repeat,
  AlertTriangle,
  DollarSign,
  Ban,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { createExpenseAction, updateExpenseAction } from "@/actions/expenses";
import {
  createScheduledExpenseAction,
  payScheduledExpenseAction,
  cancelScheduledExpenseAction,
  updateScheduledExpenseAction,
} from "@/actions/scheduledExpenses";
import { getTodayDateString, dateToInputString, formatDisplayDate } from "@/lib/expenses/date";

export interface ExpenseItem {
  id: string;
  concept: string;
  category: string;
  amount: number | string;
  date: string | Date;
  paymentMethod: string;
  description?: string | null;
  user?: { name: string; username: string } | null;
}

export interface ScheduledExpenseItem {
  id: string;
  concept: string;
  category: string;
  amount: number | string;
  dueDate: string | Date;
  isRecurring: boolean;
  frequency: "WEEKLY" | "MONTHLY" | "ANNUAL" | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  notes?: string | null;
  user?: { name: string; username: string } | null;
  expense?: { id: string; date: string | Date; paymentMethod: string } | null;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
}

interface ExpenseManagerProps {
  expenses: ExpenseItem[];
  scheduledExpenses?: ScheduledExpenseItem[];
  categories?: ExpenseCategoryItem[];
}

const DEFAULT_CATEGORIES = [
  "Renta",
  "Servicios (Luz / Agua)",
  "Sueldos",
  "Transporte",
  "Mantenimiento",
];

const frequencyLabels: Record<string, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  ANNUAL: "Anual",
};

export function ExpenseManager({
  expenses,
  scheduledExpenses = [],
  categories = [],
}: ExpenseManagerProps) {
  // Pestaña Principal: Gastos Registrados vs Gastos Programados
  const [activeTab, setActiveTab] = useState<"paid" | "scheduled">("paid");

  // Combinar categorías fijas y personalizadas de la BD
  const availableCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories.map((c) => c.name)])
  );

  // Estados para Registro de Gasto Inmediato
  const [date, setDate] = useState(getTodayDateString());
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState(availableCategories[0] || "Servicios (Luz / Agua)");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Edición de Gasto Inmediato
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editConcept, setEditConcept] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editDescription, setEditDescription] = useState("");
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  // Estados para Programar Gasto (Futuro / Recurrente)
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [progDueDate, setProgDueDate] = useState(getTodayDateString());
  const [progConcept, setProgConcept] = useState("");
  const [progCategory, setProgCategory] = useState(availableCategories[0] || "Renta");
  const [progCustomCategory, setProgCustomCategory] = useState("");
  const [progAmount, setProgAmount] = useState("");
  const [progIsRecurring, setProgIsRecurring] = useState(false);
  const [progFrequency, setProgFrequency] = useState<"WEEKLY" | "MONTHLY" | "ANNUAL">("MONTHLY");
  const [progStartDate, setProgStartDate] = useState(getTodayDateString());
  const [progEndDate, setProgEndDate] = useState("");
  const [progNotes, setProgNotes] = useState("");
  const [isSubmittingProg, setIsSubmittingProg] = useState(false);

  // Filtros de Gastos Programados
  const [scheduledFilter, setScheduledFilter] = useState<"ALL" | "PENDING" | "OVERDUE" | "PAID" | "CANCELLED">("ALL");

  // Modal para Confirmar Pago de Gasto Programado
  const [payingScheduled, setPayingScheduled] = useState<ScheduledExpenseItem | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payDate, setPayDate] = useState(getTodayDateString());
  const [payNotes, setPayNotes] = useState("");
  const [isPayingSubmitting, setIsPayingSubmitting] = useState(false);

  // Modal para Editar Gasto Programado
  const [editingScheduled, setEditingScheduled] = useState<ScheduledExpenseItem | null>(null);
  const [editProgConcept, setEditProgConcept] = useState("");
  const [editProgCategory, setEditProgCategory] = useState("");
  const [editProgCustomCategory, setEditProgCustomCategory] = useState("");
  const [editProgAmount, setEditProgAmount] = useState("");
  const [editProgDueDate, setEditProgDueDate] = useState("");
  const [editProgNotes, setEditProgNotes] = useState("");
  const [isEditingProgSubmitting, setIsEditingProgSubmitting] = useState(false);

  const isOther = category === "OTHER" || category === "Otros";
  const isEditOther = editCategory === "OTHER" || editCategory === "Otros";
  const isProgOther = progCategory === "OTHER" || progCategory === "Otros";
  const isEditProgOther = editProgCategory === "OTHER" || editProgCategory === "Otros";

  // Fecha de referencia hoy a las 00:00 para detectar vencidos
  const todayRef = new Date();
  todayRef.setHours(0, 0, 0, 0);

  // Cálculo de indicadores de gastos programados
  const pendingScheduledList = scheduledExpenses.filter((s) => s.status === "PENDING");
  const overdueScheduledList = pendingScheduledList.filter((s) => new Date(s.dueDate) < todayRef);
  const upcomingSoonList = pendingScheduledList.filter((s) => {
    const d = new Date(s.dueDate);
    const diffDays = Math.ceil((d.getTime() - todayRef.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  });

  const totalPendingAmount = pendingScheduledList.reduce((acc, s) => acc + Number(s.amount), 0);

  // Filtrado de lista según el botón de filtro
  const filteredScheduledExpenses = scheduledExpenses.filter((s) => {
    if (scheduledFilter === "ALL") return true;
    if (scheduledFilter === "PAID") return s.status === "PAID";
    if (scheduledFilter === "CANCELLED") return s.status === "CANCELLED";
    if (scheduledFilter === "OVERDUE") {
      return s.status === "PENDING" && new Date(s.dueDate) < todayRef;
    }
    if (scheduledFilter === "PENDING") {
      return s.status === "PENDING" && new Date(s.dueDate) >= todayRef;
    }
    return true;
  });

  // Manejo de Registro Inmediato
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

  // Manejo de Edición Inmediata
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

  // Manejo de Programación de Gasto
  const handleProgramSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmittingProg(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("isRecurring", String(progIsRecurring));
      if (progIsRecurring) {
        formData.set("frequency", progFrequency);
        formData.set("startDate", progStartDate);
        if (progEndDate) formData.set("endDate", progEndDate);
      } else {
        formData.set("dueDate", progDueDate);
      }
      await createScheduledExpenseAction(formData);
      setFeedback({
        type: "success",
        message: progIsRecurring
          ? "Gasto recurrente programado exitosamente. Las obligaciones mensuales han sido generadas sin afectar la utilidad hasta su pago."
          : "Gasto futuro programado exitosamente. Se registrará en la utilidad únicamente cuando confirmes su pago.",
      });
      setShowProgramForm(false);
      setProgConcept("");
      setProgAmount("");
      setProgNotes("");
      setProgCustomCategory("");
      setProgIsRecurring(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al programar gasto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmittingProg(false);
    }
  };

  // Manejo de Pago de Gasto Programado
  const handlePayScheduled = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingScheduled) return;
    setIsPayingSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("scheduledExpenseId", payingScheduled.id);
      formData.set("paymentMethod", payMethod);
      formData.set("paymentDate", payDate);
      if (payNotes) formData.set("description", payNotes);

      await payScheduledExpenseAction(formData);
      setPayingScheduled(null);
      setFeedback({
        type: "success",
        message: `Pago de "${payingScheduled.concept}" registrado exitosamente. Ahora aparece como gasto real en los reportes financieros.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el pago";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsPayingSubmitting(false);
    }
  };

  // Manejo de Cancelación de Gasto Programado
  const handleCancelScheduled = async (id: string, conceptName: string) => {
    if (!confirm(`¿Estás seguro de cancelar el gasto programado "${conceptName}"? No se descontará ni registrará ningún cobro.`)) {
      return;
    }
    try {
      await cancelScheduledExpenseAction(id);
      setFeedback({
        type: "success",
        message: `Compromiso "${conceptName}" cancelado correctamente.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cancelar";
      setFeedback({ type: "error", message: msg });
    }
  };

  // Manejo de Edición de Gasto Programado
  const handleEditScheduledSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingScheduled) return;
    setIsEditingProgSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateScheduledExpenseAction(editingScheduled.id, formData);
      setEditingScheduled(null);
      setFeedback({
        type: "success",
        message: "Compromiso programado actualizado exitosamente.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar compromiso";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsEditingProgSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* ==================================================================== */}
      {/* Encabezado y Selector de Secciones */}
      {/* ==================================================================== */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ReceiptText className="w-7 h-7 text-[#cfd500]" />
            Control de Gastos del Negocio
          </h1>
          <p className="text-sm text-slate-500">
            Administración de gastos pagados en caja y compromisos programados futuros
          </p>
        </div>

        {/* Pestañas de Vista */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setActiveTab("paid")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "paid"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Gastos Pagados ({expenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "scheduled"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Programados ({pendingScheduledList.length})</span>
            {overdueScheduledList.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Feedback General */}
      {feedback && (
        <div
          className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
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

      {/* ==================================================================== */}
      {/* VISTA 1: GASTOS REGISTRADOS (PAGADOS) */}
      {/* ==================================================================== */}
      {activeTab === "paid" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Formulario de Registro Inmediato */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-black flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-emerald-600" />
              Registrar Gasto Pagado
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#cfd500]" />
                  Fecha del Pago *
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

              {isOther && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5 transition-all">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-[#9da101]" />
                    <span>Nueva Categoría de Gasto</span>
                  </div>
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
                className="w-full py-3 rounded-xl font-black text-black text-sm shadow-md transition-all cursor-pointer hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "#cfd500" }}
              >
                {isSubmitting ? "Registrando..." : "Registrar Gasto Pagado"}
              </button>
            </form>
          </div>

          {/* Historial de Gastos Pagados */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col">
            <h2 className="text-base font-black mb-4">Historial de Gastos Efectivos</h2>

            {expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No hay gastos pagados registrados aún.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Concepto</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-500 whitespace-nowrap">
                          {formatDisplayDate(e.date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {e.concept}
                          {e.description && (
                            <div className="text-[10px] text-slate-400 font-normal">{e.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                          {e.paymentMethod === "CASH" ? "Efectivo" : e.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-red-500 whitespace-nowrap">
                          {formatCurrency(Number(e.amount))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setEditingExpense(e);
                              setEditDate(dateToInputString(e.date));
                              setEditConcept(e.concept);
                              setEditCategory(e.category);
                              setEditAmount(String(e.amount));
                              setEditPaymentMethod(e.paymentMethod || "CASH");
                              setEditDescription(e.description || "");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar gasto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA 2: GASTOS PROGRAMADOS Y RECURRENTES */}
      {/* ==================================================================== */}
      {activeTab === "scheduled" && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen de Compromisos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Compromisos Pendientes</span>
              <div className="font-black text-2xl text-amber-600 mt-1">
                {formatCurrency(totalPendingAmount)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {pendingScheduledList.length} obligación(es) no descontadas aún
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Próximos a Vencer (≤ 5 días)</span>
              <div className="font-black text-2xl text-slate-900 dark:text-white mt-1">
                {upcomingSoonList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Compromisos con fecha cercana
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-xs ${
                overdueScheduledList.length > 0
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-red-600">Compromisos Vencidos</span>
              <div className="font-black text-2xl text-red-600 mt-1">
                {overdueScheduledList.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {overdueScheduledList.length > 0
                  ? "Obligaciones cuya fecha prevista ya pasó"
                  : "Al corriente, sin adeudos vencidos"}
              </div>
            </div>
          </div>

          {/* Botón para Abrir / Cerrar Formulario de Programación */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `Todos (${scheduledExpenses.length})` },
                { id: "PENDING", label: `Pendientes (${pendingScheduledList.length - overdueScheduledList.length})` },
                { id: "OVERDUE", label: `Vencidos (${overdueScheduledList.length})` },
                { id: "PAID", label: "Pagados" },
                { id: "CANCELLED", label: "Cancelados" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setScheduledFilter(f.id as typeof scheduledFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    scheduledFilter === f.id
                      ? "bg-black text-[#cfd500]"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowProgramForm(!showProgramForm)}
              className="px-4 py-2 rounded-xl font-black text-xs bg-[#cfd500] text-black shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
            >
              {showProgramForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showProgramForm ? "Cerrar Formulario" : "Programar Nuevo Gasto"}</span>
            </button>
          </div>

          {/* Formulario de Programación de Gasto */}
          {showProgramForm && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-base font-black mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Programar Gasto Futuro o Recurrente
              </h3>

              <form onSubmit={handleProgramSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Concepto *
                    </label>
                    <input
                      name="concept"
                      type="text"
                      required
                      placeholder="Ej. Renta Local, Pago CFE..."
                      value={progConcept}
                      onChange={(e) => setProgConcept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Categoría *
                    </label>
                    <select
                      name="category"
                      value={progCategory}
                      onChange={(e) => setProgCategory(e.target.value)}
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
                      Importe Previsto ($) *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={progAmount}
                      onChange={(e) => setProgAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black text-amber-600"
                    />
                  </div>
                </div>

                {isProgOther && (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nombre de la nueva categoría *
                    </label>
                    <input
                      name="customCategory"
                      type="text"
                      required
                      placeholder="Ej. Licencias de Software, Seguros..."
                      value={progCustomCategory}
                      onChange={(e) => setProgCustomCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
                    />
                  </div>
                )}

                {/* Selector: ¿Es recurrente o único? */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="recurringOption"
                        checked={!progIsRecurring}
                        onChange={() => setProgIsRecurring(false)}
                        className="text-[#cfd500] focus:ring-[#cfd500]"
                      />
                      <span>Gasto Único (Una sola fecha futura)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="recurringOption"
                        checked={progIsRecurring}
                        onChange={() => setProgIsRecurring(true)}
                        className="text-[#cfd500] focus:ring-[#cfd500]"
                      />
                      <Repeat className="w-3.5 h-3.5 text-blue-500" />
                      <span>Gasto Recurrente (Semanal, Mensual o Anual)</span>
                    </label>
                  </div>

                  {!progIsRecurring ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Fecha Prevista de Vencimiento *
                      </label>
                      <input
                        type="date"
                        value={progDueDate}
                        onChange={(e) => setProgDueDate(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Periodicidad *
                        </label>
                        <select
                          value={progFrequency}
                          onChange={(e) => setProgFrequency(e.target.value as typeof progFrequency)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                        >
                          <option value="WEEKLY">Semanal</option>
                          <option value="MONTHLY">Mensual</option>
                          <option value="ANNUAL">Anual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Fecha de Inicio *
                        </label>
                        <input
                          type="date"
                          value={progStartDate}
                          onChange={(e) => setProgStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Fecha de Fin (Opcional)
                        </label>
                        <input
                          type="date"
                          value={progEndDate}
                          onChange={(e) => setProgEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Notas / Observaciones
                  </label>
                  <input
                    name="notes"
                    type="text"
                    placeholder="Detalles sobre contrato, cuenta clabe, condiciones..."
                    value={progNotes}
                    onChange={(e) => setProgNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProgramForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProg}
                    className="px-6 py-2 rounded-xl font-black text-black text-xs shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "#cfd500" }}
                  >
                    {isSubmittingProg ? "Guardando..." : "Guardar Compromiso Programado"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla / Listado de Gastos Programados */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-black mb-4">Obligaciones y Compromisos Registrados</h2>

            {filteredScheduledExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No hay gastos programados que coincidan con el filtro seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Fecha Prevista</th>
                      <th className="py-2.5 px-3">Concepto</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-right">Importe</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredScheduledExpenses.map((s) => {
                      const dueDateObj = new Date(s.dueDate);
                      const isOverdue = s.status === "PENDING" && dueDateObj < todayRef;
                      const isDueSoon =
                        s.status === "PENDING" &&
                        !isOverdue &&
                        Math.ceil((dueDateObj.getTime() - todayRef.getTime()) / (1000 * 60 * 60 * 24)) <= 5;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">
                            {formatDisplayDate(s.dueDate)}
                            {isDueSoon && (
                              <span className="block text-[9px] font-bold text-amber-600">Vence pronto</span>
                            )}
                            {isOverdue && (
                              <span className="block text-[9px] font-bold text-red-500">Vencido</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                            {s.concept}
                            {s.notes && (
                              <div className="text-[10px] text-slate-400 font-normal">{s.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {s.isRecurring ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                                <Repeat className="w-2.5 h-2.5" />
                                {frequencyLabels[s.frequency || "MONTHLY"]}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500">Único</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {s.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {formatCurrency(Number(s.amount))}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {s.status === "PAID" && (
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-black">
                                Pagado {s.expense?.paymentMethod ? `(${s.expense.paymentMethod === "CASH" ? "Efectivo" : s.expense.paymentMethod === "CARD" ? "Tarjeta" : "Transferencia"})` : ""}
                              </span>
                            )}
                            {s.status === "CANCELLED" && (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                Cancelado
                              </span>
                            )}
                            {s.status === "PENDING" && isOverdue && (
                              <span className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 px-2.5 py-1 rounded-full text-[10px] font-black">
                                Vencido
                              </span>
                            )}
                            {s.status === "PENDING" && !isOverdue && (
                              <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {s.status === "PENDING" ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setPayingScheduled(s);
                                    setPayDate(getTodayDateString());
                                    setPayNotes(s.notes || "");
                                    setPayMethod("CASH");
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-black font-black text-[11px] shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                                  style={{ backgroundColor: "#cfd500" }}
                                  title="Confirmar y registrar pago"
                                >
                                  Pagar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingScheduled(s);
                                    setEditProgConcept(s.concept);
                                    setEditProgCategory(s.category);
                                    setEditProgAmount(String(s.amount));
                                    setEditProgDueDate(dateToInputString(s.dueDate));
                                    setEditProgNotes(s.notes || "");
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Editar compromiso"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleCancelScheduled(s.id, s.concept)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Cancelar compromiso"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Confirmar Pago de Gasto Programado */}
      {/* ==================================================================== */}
      {payingScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registrar Pago de Obligación
              </h3>
              <button
                onClick={() => setPayingScheduled(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 mb-4 space-y-1">
              <div className="text-xs text-slate-400">Concepto:</div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-100">{payingScheduled.concept}</div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">Monto a Pagar:</span>
                <span className="text-lg font-black text-red-500">{formatCurrency(Number(payingScheduled.amount))}</span>
              </div>
            </div>

            <form onSubmit={handlePayScheduled} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Fecha Efectiva del Pago *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Método de Pago *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                >
                  <option value="CASH">Efectivo (Descuenta de Caja Abierta)</option>
                  <option value="CARD">Tarjeta (Banco)</option>
                  <option value="TRANSFER">Transferencia (Banco)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Notas / Referencia del Pago
                </label>
                <input
                  type="text"
                  placeholder="Número de folio, comprobante..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingScheduled(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPayingSubmitting}
                  className="px-5 py-2 rounded-xl font-black text-black text-xs shadow-xs hover:brightness-105 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  {isPayingSubmitting ? "Procesando..." : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Editar Gasto Programado */}
      {/* ==================================================================== */}
      {editingScheduled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#cfd500]" />
                Editar Compromiso Programado
              </h3>
              <button
                onClick={() => setEditingScheduled(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditScheduledSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Concepto *
                </label>
                <input
                  name="concept"
                  type="text"
                  required
                  value={editProgConcept}
                  onChange={(e) => setEditProgConcept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Categoría *
                  </label>
                  <select
                    name="category"
                    value={editProgCategory}
                    onChange={(e) => setEditProgCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="OTHER">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Importe ($) *
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    required
                    value={editProgAmount}
                    onChange={(e) => setEditProgAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black text-amber-600"
                  />
                </div>
              </div>

              {isEditProgOther && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nueva Categoría
                  </label>
                  <input
                    name="customCategory"
                    type="text"
                    required
                    value={editProgCustomCategory}
                    onChange={(e) => setEditProgCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Fecha Prevista de Vencimiento *
                </label>
                <input
                  name="dueDate"
                  type="date"
                  required
                  value={editProgDueDate}
                  onChange={(e) => setEditProgDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Notas / Observaciones
                </label>
                <input
                  name="notes"
                  type="text"
                  value={editProgNotes}
                  onChange={(e) => setEditProgNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingScheduled(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingProgSubmitting}
                  className="px-5 py-2 rounded-xl font-black text-black text-xs shadow-xs hover:brightness-105 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  {isEditingProgSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Editar Gasto Pagado Inmediato */}
      {/* ==================================================================== */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#cfd500]" />
                Editar Gasto Pagado
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Fecha del Pago *
                </label>
                <input
                  name="date"
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black text-red-500"
                  />
                </div>
              </div>

              {isEditOther && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Nueva Categoría
                  </label>
                  <input
                    name="customCategory"
                    type="text"
                    required
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold"
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
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Descripción
                </label>
                <input
                  name="description"
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="px-5 py-2 rounded-xl font-black text-black text-xs shadow-xs hover:brightness-105 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  {isEditingSubmitting ? "Actualizando..." : "Actualizar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
