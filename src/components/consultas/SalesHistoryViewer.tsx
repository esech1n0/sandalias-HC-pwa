"use client";

import { useState } from "react";
import {
  Search,
  Receipt,
  X,
  Eye,
  Ban,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import { cancelSaleAction } from "@/actions/sales";

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  originalPrice: number | string;
  unitPrice: number | string;
  discountAmount: number | string;
  subtotal: number | string;
  totalCost: number | string;
  profit: number | string;
}

interface Payment {
  id: string;
  method: string;
  amount: number | string;
  receivedAmount?: number | string | null;
  changeGiven?: number | string | null;
}

interface Sale {
  id: string;
  folio: string;
  status: "COMPLETED" | "CANCELLED";
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  cancelledBy?: { name: string; username: string } | null;
  subtotal: number | string;
  discountAmount: number | string;
  total: number | string;
  totalCost: number | string;
  grossProfit: number | string;
  createdAt: string | Date;
  items: SaleItem[];
  payments: Payment[];
  user?: { name: string; username: string } | null;
}

interface SalesHistoryViewerProps {
  sales: Sale[];
  isEmployee?: boolean;
}

export function SalesHistoryViewer({
  sales: initialSales,
  isEmployee = false,
}: SalesHistoryViewerProps) {
  const [salesList, setSalesList] = useState<Sale[]>(initialSales);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Estado para modal de cancelación
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredSales = salesList.filter((s) => {
    const matchesSearch =
      s.folio.toLowerCase().includes(search.toLowerCase()) ||
      s.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "COMPLETED" && s.status !== "CANCELLED") ||
      (statusFilter === "CANCELLED" && s.status === "CANCELLED");

    return matchesSearch && matchesStatus;
  });

  const handleOpenCancelModal = (sale: Sale, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSaleToCancel(sale);
    setCancelReason("");
    setActionMessage(null);
  };

  const handleConfirmCancel = async () => {
    if (!saleToCancel) return;

    try {
      setIsSubmittingCancel(true);
      setActionMessage(null);

      const result = await cancelSaleAction(saleToCancel.id, cancelReason);

      // Actualizar la lista en el estado local
      setSalesList((prev) =>
        prev.map((s) => {
          if (s.id === saleToCancel.id) {
            return {
              ...s,
              status: "CANCELLED",
              cancelledAt: new Date().toISOString(),
              cancelledReason: cancelReason.trim() || "Cancelación de venta",
            };
          }
          return s;
        })
      );

      // Si el ticket detallado actual es la venta cancelada, actualizar su estado
      if (selectedSale?.id === saleToCancel.id) {
        setSelectedSale((prev) =>
          prev
            ? {
                ...prev,
                status: "CANCELLED",
                cancelledAt: new Date().toISOString(),
                cancelledReason: cancelReason.trim() || "Cancelación de venta",
              }
            : null
        );
      }

      setActionMessage({
        type: "success",
        text: `Venta ${saleToCancel.folio} cancelada exitosamente. Se restableció el stock al inventario y se actualizaron los reportes.`,
      });
      setSaleToCancel(null);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err?.message || "Ocurrió un error al intentar cancelar la venta.",
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-[#cfd500]" />
            Consultas e Historial de Ventas
          </h1>
          <p className="text-sm text-slate-500">
            Historial de tickets, métodos de pago y gestión de cancelaciones con devolución de stock
          </p>
        </div>
      </div>

      {/* Banner de Mensaje Global */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl mb-6 text-xs font-semibold flex items-center justify-between border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:opacity-70 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio o nombre de producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#cfd500]"
          />
        </div>

        {/* Filtro por Estado */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Todas ({salesList.length})
          </button>
          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            Completadas ({salesList.filter((s) => s.status !== "CANCELLED").length})
          </button>
          <button
            onClick={() => setStatusFilter("CANCELLED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "CANCELLED"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            }`}
          >
            Canceladas ({salesList.filter((s) => s.status === "CANCELLED").length})
          </button>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4 text-center">Productos</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Métodos de Pago</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron ventas para los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const totalItems = s.items.reduce((sum, i) => sum + i.quantity, 0);
                  const isCancelled = s.status === "CANCELLED";

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSale(s)}
                      className={`cursor-pointer transition-colors group ${
                        isCancelled
                          ? "bg-rose-50/40 dark:bg-rose-950/15 hover:bg-rose-100/50 dark:hover:bg-rose-950/30"
                          : "hover:bg-[#cfd500]/15 dark:hover:bg-[#cfd500]/10"
                      }`}
                    >
                      {/* Folio */}
                      <td
                        className={`py-3 px-4 font-mono font-bold ${
                          isCancelled
                            ? "text-rose-700 dark:text-rose-400 line-through"
                            : "text-slate-900 dark:text-white group-hover:text-black dark:group-hover:text-[#cfd500]"
                        }`}
                      >
                        {s.folio}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <Ban className="w-3 h-3 text-rose-500" />
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Completada
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(s.createdAt).toLocaleString("es-MX")}
                      </td>

                      {/* Cantidad Productos */}
                      <td className="py-3 px-4 text-center font-bold">{totalItems}</td>

                      {/* Total */}
                      <td
                        className={`py-3 px-4 text-right font-black text-sm ${
                          isCancelled
                            ? "text-slate-400 line-through"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {formatCurrency(s.total)}
                      </td>

                      {/* Métodos de Pago */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.payments.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800"
                            >
                              {p.method === "CASH"
                                ? "Efectivo"
                                : p.method === "CARD"
                                ? "Tarjeta"
                                : "Transferencia"}
                              : {formatCurrency(p.amount)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSale(s);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#cfd500] hover:text-black cursor-pointer active:scale-90 transition-all"
                            title="Ver detalle del ticket"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={(e) => handleOpenCancelModal(s, e)}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white cursor-pointer active:scale-90 transition-all border border-rose-200 dark:border-rose-900"
                              title="Cancelar venta y restablecer stock"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Venta / Ticket */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Detalle de Venta
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-black text-lg">{selectedSale.folio}</h3>
                  {selectedSale.status === "CANCELLED" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      Cancelada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Completada
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso especial si la venta está cancelada */}
            {selectedSale.status === "CANCELLED" && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs mb-4 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-rose-600" />
                  Esta venta fue CANCELADA
                </div>
                {selectedSale.cancelledAt && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Fecha: {new Date(selectedSale.cancelledAt).toLocaleString("es-MX")}
                  </p>
                )}
                {selectedSale.cancelledReason && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Motivo: <span className="font-semibold">{selectedSale.cancelledReason}</span>
                  </p>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  El importe no cuenta en los reportes de ventas ni ganancias y los artículos fueron
                  restablecidos al inventario.
                </p>
              </div>
            )}

            <div className="text-xs text-slate-500 mb-4 space-y-1">
              <div>Fecha y Hora: {new Date(selectedSale.createdAt).toLocaleString("es-MX")}</div>
              <div>Vendedor: {selectedSale.user?.name || "Administrador"}</div>
            </div>

            {/* Partidas */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b text-slate-400 font-bold uppercase">
                    <th className="p-2.5">Producto</th>
                    <th className="p-2.5 text-center">Cant.</th>
                    <th className="p-2.5 text-right">P. Unit</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedSale.items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-2.5 font-bold">{i.productName}</td>
                      <td className="p-2.5 text-center">{i.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(i.unitPrice)}</td>
                      <td className="p-2.5 text-right font-black">{formatCurrency(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {Number(selectedSale.discountAmount) > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Descuento aplicado:</span>
                  <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total Cobrado:</span>
                <span className={selectedSale.status === "CANCELLED" ? "line-through text-slate-400" : ""}>
                  {formatCurrency(selectedSale.total)}
                </span>
              </div>
            </div>

            {/* Módulo de Ganancia Obtenida (solo para administradores) */}
            {!isEmployee && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs mb-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300 block tracking-wider">
                    Ganancia Obtenida
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Costo de inversión: {formatCurrency(selectedSale.totalCost)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(selectedSale.grossProfit)}
                  </span>
                </div>
              </div>
            )}

            {/* Pagos */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 mb-4">
              <div className="font-bold text-slate-500 uppercase text-[10px] mb-1">
                Pagos Registrados:
              </div>
              {selectedSale.payments.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>
                    {p.method === "CASH"
                      ? "Efectivo"
                      : p.method === "CARD"
                      ? "Tarjeta"
                      : "Transferencia"}
                    :
                  </span>
                  <span className="font-bold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {selectedSale.payments.find((p) => p.changeGiven) && (
                <div className="flex justify-between text-emerald-600 font-bold pt-1 border-t">
                  <span>Cambio Entregado:</span>
                  <span>
                    {formatCurrency(
                      selectedSale.payments.find((p) => p.changeGiven)?.changeGiven
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Botones de acción del modal */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar Detalle
              </button>

              {selectedSale.status !== "CANCELLED" && (
                <button
                  onClick={() => handleOpenCancelModal(selectedSale)}
                  className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancelar Venta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cancelación */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Cancelar Venta {saleToCancel.folio}
                </h3>
                <p className="text-xs text-slate-500">
                  Esta acción revertirá los efectos financieros e inventario.
                </p>
              </div>
            </div>

            {/* Resumen del impacto */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-500">Total a descontar:</span>
                <span className="text-base text-rose-600 font-black">
                  {formatCurrency(saleToCancel.total)}
                </span>
              </div>

              {/* Productos que se devolverán al stock */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Productos a restablecer en inventario:
                </span>
                <ul className="space-y-1">
                  {saleToCancel.items.map((i) => (
                    <li
                      key={i.id}
                      className="flex justify-between items-center text-[11px] text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <span>{i.productName}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        +{i.quantity} pzas
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Alerta de confirmación */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-[11px] leading-relaxed">
                El dinero de venta y ganancia se descontará de todos los reportes (día, semana, mes, año y acumulado) y el stock de los productos se incrementará inmediatamente.
              </p>
            </div>

            {/* Motivo de Cancelación */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Motivo de la cancelación (opcional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Devolución de cliente, error en captura, etc."
                disabled={isSubmittingCancel}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                disabled={isSubmittingCancel}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
              >
                {isSubmittingCancel ? (
                  <span>Cancelando...</span>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Confirmar Cancelación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
