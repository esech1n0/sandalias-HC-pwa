"use client";

import { useState } from "react";
import {
  Package,
  Plus,
  ArrowDownToLine,
  SlidersHorizontal,
  History,
  Tag,
  Search,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import {
  createProductAction,
  adjustStockAction,
  createPurchaseAction,
  createCategoryAction,
} from "@/actions/inventory";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  salePrice: number;
  currentCost: number;
  stock: number;
  minStock: number;
  imageUrl?: string | null;
  isActive: boolean;
  category: Category;
}

interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string | Date;
  product?: { name: string };
  user?: { name: string; username: string } | null;
}

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  movements: InventoryMovement[];
}

export function InventoryManager({
  products,
  categories,
  movements,
}: InventoryManagerProps) {
  const [activeTab, setActiveTab] = useState<
    "products" | "newProduct" | "purchase" | "adjustment" | "categories" | "history"
  >("products");

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");

  // Formularios
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustNewStock, setAdjustNewStock] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Compra / Entrada
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");
  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("10");
  const [purchaseUnitCost, setPurchaseUnitCost] = useState("150");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  // Nueva Categoría
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#cfd500");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === "ALL" || p.categoryId === selectedCat;
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await adjustStockAction(
        adjustProductId,
        parseInt(adjustNewStock, 10),
        adjustReason
      );
      setFeedback({ type: "success", message: "Ajuste de inventario guardado correctamente con trazabilidad." });
      setAdjustProductId("");
      setAdjustNewStock("");
      setAdjustReason("");
      setActiveTab("products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al ajustar stock";
      setFeedback({ type: "error", message: msg });
    }
  };

  const handlePurchaseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createPurchaseAction({
        supplier: purchaseSupplier,
        paymentMethod: purchasePaymentMethod,
        notes: purchaseNotes,
        items: [
          {
            productId: purchaseProductId,
            quantity: parseInt(purchaseQuantity, 10),
            unitCost: parseFloat(purchaseUnitCost),
          },
        ],
      });
      setFeedback({
        type: "success",
        message: "Entrada de mercancía registrada. Inventario incrementado y costo actualizado por Promedio Ponderado.",
      });
      setPurchaseSupplier("");
      setPurchaseNotes("");
      setActiveTab("products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar entrada";
      setFeedback({ type: "error", message: msg });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createCategoryAction(newCatName, newCatColor);
      setFeedback({ type: "success", message: "Categoría creada exitosamente." });
      setNewCatName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear categoría";
      setFeedback({ type: "error", message: msg });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Título y Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-7 h-7 text-[#cfd500]" />
            Inventario y Mercancía
          </h1>
          <p className="text-sm text-slate-500">
            Control de productos, stock, entradas a proveedores y trazabilidad
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "products"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab("newProduct")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "newProduct"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "purchase"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Entrada de Mercancía
          </button>
          <button
            onClick={() => setActiveTab("adjustment")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "adjustment"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Ajuste Manual
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "categories"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            <Tag className="w-4 h-4" /> Categorías
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-black text-[#cfd500]"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" /> Historial
          </button>
        </div>
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
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Catálogo de Productos */}
      {/* ==================================================================== */}
      {activeTab === "products" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
          {/* Filtros */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en inventario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
              <button
                onClick={() => setSelectedCat("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  selectedCat === "ALL" ? "bg-black text-[#cfd500]" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                }`}
              >
                Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    selectedCat === c.id ? "bg-black text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Costo Actual</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Mínimo</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No hay productos registrados con esos filtros.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLowStock = p.stock < p.minStock;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold text-black"
                            style={{ backgroundColor: p.category.color }}
                          >
                            {p.category.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black">
                          {formatCurrency(p.salePrice)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(p.currentCost)}
                        </td>
                        <td className="py-3 px-4 text-center font-black">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isLowStock
                                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">
                          {p.minStock}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isLowStock ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                              Bajo Stock
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Registrar Nuevo Producto */}
      {/* ==================================================================== */}
      {activeTab === "newProduct" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-black mb-4">Registrar Nuevo Producto</h2>
          <form
            action={async (formData) => {
              try {
                await createProductAction(formData);
                setFeedback({ type: "success", message: "Producto creado con éxito." });
                setActiveTab("products");
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Error al crear producto";
                setFeedback({ type: "error", message: msg });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nombre del Producto *
              </label>
              <input
                name="name"
                required
                placeholder="Ej. Sandalia Plataforma Confort Negra"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Categoría *
                </label>
                <select
                  name="categoryId"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Stock Mínimo (Alerta)
                </label>
                <input
                  name="minStock"
                  type="number"
                  defaultValue="5"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Precio de Venta ($) *
                </label>
                <input
                  name="salePrice"
                  type="number"
                  step="any"
                  required
                  placeholder="300.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Costo de Adquisición ($) *
                </label>
                <input
                  name="currentCost"
                  type="number"
                  step="any"
                  required
                  placeholder="180.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Stock Inicial (Entero)
                </label>
                <input
                  name="stock"
                  type="number"
                  defaultValue="10"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105"
              style={{ backgroundColor: "#cfd500" }}
            >
              Guardar Producto
            </button>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Entrada de Mercancía / Compra a Proveedor */}
      {/* ==================================================================== */}
      {activeTab === "purchase" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="mb-4">
            <h2 className="text-lg font-black">Registrar Entrada / Compra a Proveedor</h2>
            <p className="text-xs text-slate-500">
              Aumenta el inventario, actualiza el costo mediante Promedio Ponderado y descuenta de caja si es en efectivo.
            </p>
          </div>

          <form onSubmit={handlePurchaseEntry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Calzado León SA"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Método de Pago
                </label>
                <select
                  value={purchasePaymentMethod}
                  onChange={(e) => setPurchasePaymentMethod(e.target.value as "CASH" | "CARD" | "TRANSFER")}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                >
                  <option value="CASH">Efectivo (Descuenta de Caja Abierta)</option>
                  <option value="CARD">Tarjeta (Banco)</option>
                  <option value="TRANSFER">Transferencia (Banco)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Producto que ingresa *
              </label>
              <select
                required
                value={purchaseProductId}
                onChange={(e) => setPurchaseProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              >
                <option value="">Selecciona un producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock actual: {p.stock}, Costo actual: {formatCurrency(p.currentCost)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Cantidad Comprada (Entero) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Costo Unitario de Adquisición ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={purchaseUnitCost}
                  onChange={(e) => setPurchaseUnitCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black text-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Notas / Factura (Opcional)
              </label>
              <input
                type="text"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="Observaciones de la compra..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between font-bold text-sm">
              <span>Total de la Compra:</span>
              <span className="text-base text-slate-900 dark:text-white">
                {formatCurrency((parseInt(purchaseQuantity, 10) || 0) * (parseFloat(purchaseUnitCost) || 0))}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105"
              style={{ backgroundColor: "#cfd500" }}
            >
              Registrar Entrada de Mercancía
            </button>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Ajuste Manual de Inventario */}
      {/* ==================================================================== */}
      {activeTab === "adjustment" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="mb-4">
            <h2 className="text-lg font-black">Ajuste Manual de Inventario</h2>
            <p className="text-xs text-slate-500">
              Regla de negocio: Toda modificación manual guarda motivo, usuario, fecha y cantidad obligatoriamente.
            </p>
          </div>

          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Producto a Ajustar *
              </label>
              <select
                required
                value={adjustProductId}
                onChange={(e) => {
                  setAdjustProductId(e.target.value);
                  const p = products.find((prod) => prod.id === e.target.value);
                  if (p) setAdjustNewStock(p.stock.toString());
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              >
                <option value="">Selecciona un producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock Actual: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nuevo Stock Real Contado (Entero) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjustNewStock}
                onChange={(e) => setAdjustNewStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Motivo del Ajuste (Obligatorio) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Conteo físico mensual, merma por defecto, etc."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105"
              style={{ backgroundColor: "#cfd500" }}
            >
              Guardar Ajuste
            </button>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Categorías y Colores */}
      {/* ==================================================================== */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-black mb-4">Añadir Categoría</h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nombre de Categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pantuflas de Niño"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Color Visual en Ventas
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border"
                  />
                  <input
                    type="text"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105"
                style={{ backgroundColor: "#cfd500" }}
              >
                + Añadir Categoría
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-black mb-4">Categorías Registradas ({categories.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{c.color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Historial de Movimientos de Inventario */}
      {/* ==================================================================== */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 overflow-hidden">
          <h2 className="text-lg font-black mb-3">Trazabilidad de Movimientos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Cambio</th>
                  <th className="py-2.5 px-3 text-center">Stock Resultante</th>
                  <th className="py-2.5 px-3">Motivo</th>
                  <th className="py-2.5 px-3">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay movimientos registrados aún.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {new Date(m.createdAt).toLocaleString("es-MX")}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                        {m.product?.name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {m.type === "SALE" && <span className="text-blue-500">Venta</span>}
                        {m.type === "PURCHASE" && <span className="text-emerald-500">Compra</span>}
                        {m.type === "ADJUSTMENT" && <span className="text-amber-500">Ajuste</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black">
                        <span className={m.quantity > 0 ? "text-emerald-600" : "text-red-600"}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{m.newStock}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{m.reason}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-medium">
                        {m.user?.name || m.user?.username || "Sistema"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
