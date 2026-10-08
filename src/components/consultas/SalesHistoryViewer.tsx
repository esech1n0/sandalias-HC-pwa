"use client";

import { useState } from "react";
import { Search, Receipt, X, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/money";

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
  sales,
  isEmployee = false,
}: SalesHistoryViewerProps) {
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter((s) => {
    return (
      s.folio.toLowerCase().includes(search.toLowerCase()) ||
      s.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Receipt className="w-7 h-7 text-[#cfd500]" />
          Consultas e Historial de Ventas
        </h1>
        <p className="text-sm text-slate-500">
          Consulta inmutable de ventas registradas, tickets y métodos de pago
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio o nombre de producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4 text-center">Productos</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Métodos de Pago</th>
                {!isEmployee && <th className="py-3 px-4 text-center">Detalle</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 5 : 6} className="py-12 text-center text-slate-400">
                    No se encontraron ventas.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const totalItems = s.items.reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <tr
                      key={s.id}
                      onClick={!isEmployee ? () => setSelectedSale(s) : undefined}
                      className={
                        !isEmployee
                          ? "cursor-pointer hover:bg-[#cfd500]/15 dark:hover:bg-[#cfd500]/10 transition-colors group"
                          : "transition-colors"
                      }
                    >
                      <td className={`py-3 px-4 font-mono font-bold text-slate-900 dark:text-white ${!isEmployee ? "group-hover:text-black dark:group-hover:text-[#cfd500]" : ""}`}>
                        {s.folio}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(s.createdAt).toLocaleString("es-MX")}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{totalItems}</td>
                      <td className="py-3 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.payments.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800"
                            >
                              {p.method === "CASH" ? "Efectivo" : p.method === "CARD" ? "Tarjeta" : "Transferencia"}: {formatCurrency(p.amount)}
                            </span>
                          ))}
                        </div>
                      </td>
                      {!isEmployee && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSale(s);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-[#cfd500] group-hover:text-black cursor-pointer active:scale-90 transition-all"
                            title="Ver detalle del ticket"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Venta / Ticket */}
      {!isEmployee && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Detalle de Venta</span>
                <h3 className="font-mono font-black text-lg">{selectedSale.folio}</h3>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            {/* Módulo de Ganancia Obtenida */}
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

            {/* Pagos */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 mb-4">
              <div className="font-bold text-slate-500 uppercase text-[10px] mb-1">
                Pagos Registrados:
              </div>
              {selectedSale.payments.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>
                    {p.method === "CASH" ? "Efectivo" : p.method === "CARD" ? "Tarjeta" : "Transferencia"}:
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

            <button
              onClick={() => setSelectedSale(null)}
              className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
