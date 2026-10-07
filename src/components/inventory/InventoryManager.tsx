"use client";

import { useState, useEffect } from "react";
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
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  adjustStockAction,
  createPurchaseAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
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

  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");

  // Formularios Ajuste Manual
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

  // Nueva Categoría (Tab Categorías)
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#cfd500");

  // Edición y Eliminación de Categorías (al presionar sobre ellas)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalMode, setCategoryModalMode] = useState<"options" | "edit" | "delete" | null>(null);
  const [catEditName, setCatEditName] = useState("");
  const [catEditColor, setCatEditColor] = useState("#cfd500");
  const [isProcessingCat, setIsProcessingCat] = useState(false);

  // Edición de Productos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editCurrentCost, setEditCurrentCost] = useState("");
  const [editMinStock, setEditMinStock] = useState("5");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Eliminación de Producto
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Formulario Nuevo Producto con estado controlado
  const [newProdName, setNewProdName] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdCatId, setNewProdCatId] = useState("");
  const [newProdSalePrice, setNewProdSalePrice] = useState("");
  const [newProdCurrentCost, setNewProdCurrentCost] = useState("");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdMinStock, setNewProdMinStock] = useState("5");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Creación rápida de categoría dentro de Nuevo Producto
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isCreatingQuickCat, setIsCreatingQuickCat] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredProducts = localProducts.filter((p) => {
    const matchesCat = selectedCat === "ALL" || p.categoryId === selectedCat;
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Apertura de modal de edición de producto
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditDescription(p.description || "");
    setEditCategoryId(p.categoryId);
    setEditSalePrice(p.salePrice.toString());
    setEditCurrentCost(p.currentCost.toString());
    setEditMinStock(p.minStock.toString());
    setEditIsActive(p.isActive);
  };

  // Guardar cambios al editar producto
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingProduct(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("categoryId", editCategoryId);
      formData.append("salePrice", editSalePrice);
      formData.append("currentCost", editCurrentCost);
      formData.append("minStock", editMinStock);
      formData.append("isActive", editIsActive ? "true" : "false");

      const updated = await updateProductAction(editingProduct.id, formData);
      if (updated) {
        const cat = localCategories.find((c) => c.id === editCategoryId);
        setLocalProducts((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  ...updated,
                  category: cat || item.category,
                }
              : item
          )
        );
      }
      setFeedback({ type: "success", message: `Producto "${editName}" actualizado con éxito.` });
      setEditingProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar producto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    setFeedback(null);
    try {
      await deleteProductAction(productToDelete.id);
      setLocalProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      if (adjustProductId === productToDelete.id) {
        setAdjustProductId("");
        setAdjustNewStock("");
        setAdjustReason("");
      }
      setFeedback({
        type: "success",
        message: `Producto "${productToDelete.name}" eliminado correctamente.`,
      });
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar producto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const updated = await adjustStockAction(
        adjustProductId,
        parseInt(adjustNewStock, 10),
        adjustReason
      );
      if (updated) {
        setLocalProducts((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, stock: updated.stock } : item))
        );
      }
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
      const created = await createCategoryAction(newCatName, newCatColor);
      setLocalCategories((prev) => [...prev, created]);
      setFeedback({ type: "success", message: "Categoría creada exitosamente." });
      setNewCatName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear categoría";
      setFeedback({ type: "error", message: msg });
    }
  };

  // Click en categoría existente para abrir opciones
  const handleSelectCategory = (c: Category) => {
    setSelectedCategory(c);
    setCatEditName(c.name);
    setCatEditColor(c.color);
    setCategoryModalMode("options");
  };

  // Guardar edición de categoría
  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setIsProcessingCat(true);
    setFeedback(null);
    try {
      const updated = await updateCategoryAction(selectedCategory.id, catEditName, catEditColor);
      setLocalCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name, color: updated.color } : c))
      );
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.categoryId === updated.id
            ? { ...p, category: { ...p.category, name: updated.name, color: updated.color } }
            : p
        )
      );
      setFeedback({ type: "success", message: `Categoría "${catEditName}" actualizada.` });
      setCategoryModalMode(null);
      setSelectedCategory(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar categoría";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsProcessingCat(false);
    }
  };

  // Confirmar eliminación de categoría
  const handleConfirmDeleteCategory = async () => {
    if (!selectedCategory) return;
    setIsProcessingCat(true);
    setFeedback(null);
    try {
      await deleteCategoryAction(selectedCategory.id);
      setLocalCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      setFeedback({ type: "success", message: `Categoría "${selectedCategory.name}" eliminada correctamente.` });
      setCategoryModalMode(null);
      setSelectedCategory(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar categoría";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsProcessingCat(false);
    }
  };

  // Guardar nueva categoría rápida desde el formulario de Nuevo Producto
  const handleQuickAddCategory = async () => {
    if (!quickCategoryName.trim()) return;
    setIsCreatingQuickCat(true);
    setFeedback(null);
    try {
      const created = await createCategoryAction(quickCategoryName.trim(), "#cfd500");
      setLocalCategories((prev) => [...prev, created]);
      setNewProdCatId(created.id);
      setQuickCategoryName("");
      setShowQuickCategory(false);
      setFeedback({
        type: "success",
        message: `Categoría "${created.name}" guardada y seleccionada para este producto.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear categoría";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsCreatingQuickCat(false);
    }
  };

  // Guardar Nuevo Producto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setFeedback({ type: "error", message: "El nombre del producto es obligatorio." });
      return;
    }
    const catId = newProdCatId || (localCategories.length > 0 ? localCategories[0].id : "");
    if (!catId) {
      setFeedback({ type: "error", message: "Por favor selecciona o crea una categoría." });
      return;
    }

    setIsCreatingProduct(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("name", newProdName);
      formData.append("description", newProdDesc);
      formData.append("categoryId", catId);
      formData.append("salePrice", newProdSalePrice || "0");
      formData.append("currentCost", newProdCurrentCost || "0");
      formData.append("stock", newProdStock || "0");
      formData.append("minStock", newProdMinStock || "5");

      const created = await createProductAction(formData);
      if (created) {
        const cat = localCategories.find((c) => c.id === catId);
        setLocalProducts((prev) => [
          ...prev,
          {
            ...created,
            category: cat || { id: catId, name: "General", color: "#cfd500" },
          },
        ]);
      }

      setFeedback({ type: "success", message: "Producto registrado exitosamente." });
      setNewProdName("");
      setNewProdDesc("");
      setNewProdSalePrice("");
      setNewProdCurrentCost("");
      setNewProdStock("10");
      setNewProdMinStock("5");
      setActiveTab("products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear producto";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsCreatingProduct(false);
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
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
              activeTab === "products"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab("newProduct")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeTab === "newProduct"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
            }`}
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeTab === "purchase"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Entrada de Mercancía
          </button>
          <button
            onClick={() => setActiveTab("adjustment")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeTab === "adjustment"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Ajuste Manual
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeTab === "categories"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
            }`}
          >
            <Tag className="w-4 h-4" /> Categorías
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              activeTab === "history"
                ? "bg-black text-[#cfd500] shadow-xs"
                : "bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-200 hover:border-[#cfd500]"
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
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer active:scale-95 transition-all ${
                  selectedCat === "ALL"
                    ? "bg-black text-[#cfd500] shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-black dark:hover:text-white"
                }`}
              >
                Todas
              </button>
              {localCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                    selectedCat === c.id
                      ? "bg-black text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-black dark:hover:text-white"
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
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
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
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustProductId(p.id);
                                setAdjustNewStock(p.stock.toString());
                                setAdjustReason("");
                                setActiveTab("adjustment");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-[#cfd500] hover:text-black transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              title="Ajuste Manual de Stock"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Ajuste</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProduct(p)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black text-[#cfd500] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                              title="Editar Producto"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                              title="Eliminar Producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
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
      )}

      {/* ==================================================================== */}
      {/* Pestaña: Registrar Nuevo Producto */}
      {/* ==================================================================== */}
      {activeTab === "newProduct" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-black mb-4">Registrar Nuevo Producto</h2>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Sandalia Plataforma Confort Negra"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase">
                    Categoría *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCategory(!showQuickCategory)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {showQuickCategory ? "✕ Cancelar" : "+ Añadir nueva categoría"}
                  </button>
                </div>

                {/* Submódulo para crear categoría por escrito sin perder datos del producto */}
                {showQuickCategory ? (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Escribe el nombre de la nueva categoría:
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej. Sandalias de Tacón"
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-semibold"
                      />
                      <button
                        type="button"
                        disabled={isCreatingQuickCat || !quickCategoryName.trim()}
                        onClick={handleQuickAddCategory}
                        className="px-3 py-1.5 bg-black text-[#cfd500] font-bold rounded-lg text-xs hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isCreatingQuickCat ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <select
                  required
                  value={newProdCatId || (localCategories[0]?.id || "")}
                  onChange={(e) => setNewProdCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                >
                  {localCategories.map((c) => (
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
                  type="number"
                  min="0"
                  value={newProdMinStock}
                  onChange={(e) => setNewProdMinStock(e.target.value)}
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
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="300.00"
                  value={newProdSalePrice}
                  onChange={(e) => setNewProdSalePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Costo de Adquisición ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="180.00"
                  value={newProdCurrentCost}
                  onChange={(e) => setNewProdCurrentCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Stock Inicial (Entero)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Descripción (Opcional)
              </label>
              <input
                type="text"
                placeholder="Detalles del material, suela o modelo"
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingProduct}
              className="w-full py-3.5 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: "#cfd500" }}
            >
              {isCreatingProduct ? "Guardando Producto..." : "Guardar Producto"}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">
                  Producto a Ajustar *
                </label>
                {adjustProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = localProducts.find((p) => p.id === adjustProductId);
                      if (prod) setProductToDelete(prod);
                    }}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Eliminar este producto"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar producto</span>
                  </button>
                )}
              </div>
              <select
                required
                value={adjustProductId}
                onChange={(e) => {
                  setAdjustProductId(e.target.value);
                  const p = localProducts.find((prod) => prod.id === e.target.value);
                  if (p) setAdjustNewStock(p.stock.toString());
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
              >
                <option value="">Selecciona un producto...</option>
                {localProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock Actual: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {adjustProductId && (
              <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-bold text-red-700 dark:text-red-400">
                    ¿Deseas dar de baja o eliminar este producto?
                  </p>
                  <p className="text-red-600/80 dark:text-red-400/80 text-[11px]">
                    Puedes retirarlo del catálogo si ya no se comercializa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const prod = localProducts.find((p) => p.id === adjustProductId);
                    if (prod) setProductToDelete(prod);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Eliminar este producto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Producto</span>
                </button>
              </div>
            )}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">Categorías Registradas ({localCategories.length})</h2>
              <span className="text-[11px] text-slate-400">Presiona una para Editar o Eliminar</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {localCategories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCategory(c)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-[#cfd500] hover:bg-[#cfd500]/10 dark:hover:bg-[#cfd500]/10 transition-all flex items-center justify-between cursor-pointer group active:scale-[0.99] shadow-xs"
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-slate-800 dark:text-slate-100 group-hover:text-black dark:group-hover:text-[#cfd500]">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{c.color}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border group-hover:bg-[#cfd500] group-hover:text-black transition-colors">
                      Gestionar
                    </span>
                  </div>
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

      {/* ==================================================================== */}
      {/* Modal: Editar Producto */}
      {/* ==================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Inventario</span>
                <h3 className="font-black text-lg">Editar Producto</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Categoría *
                  </label>
                  <select
                    required
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                  >
                    {localCategories.map((c) => (
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
                    type="number"
                    min="0"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Precio de Venta ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-black text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Costo de Adquisición ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editCurrentCost}
                    onChange={(e) => setEditCurrentCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#cfd500] focus:ring-[#cfd500] cursor-pointer"
                />
                <label htmlFor="editIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Producto Activo (Visible en Punto de Venta)
                </label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 py-2.5 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  {isSavingProduct ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Opciones / Editar / Eliminar Categoría */}
      {/* ==================================================================== */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <h3 className="font-black text-base">
                  Categoría: {selectedCategory.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setCategoryModalMode(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modo 1: Opciones Principales (Editar o Eliminar) */}
            {categoryModalMode === "options" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Selecciona la acción que deseas realizar para la categoría <strong className="text-slate-900 dark:text-white">"{selectedCategory.name}"</strong>:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryModalMode("edit")}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-[#cfd500] hover:bg-[#cfd500]/15 flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="p-2.5 rounded-full bg-black text-[#cfd500] group-hover:scale-110 transition-transform">
                      <Pencil className="w-5 h-5" />
                    </div>
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryModalMode("delete")}
                    className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex flex-col items-center justify-center gap-2 font-bold text-xs text-red-600 dark:text-red-400 transition-all cursor-pointer group active:scale-95"
                  >
                    <div className="p-2.5 rounded-full bg-red-600 text-white group-hover:scale-110 transition-transform">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modo 2: Formulario de Edición */}
            {categoryModalMode === "edit" && (
              <form onSubmit={handleSaveEditCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Nombre de Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    value={catEditName}
                    onChange={(e) => setCatEditName(e.target.value)}
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
                      value={catEditColor}
                      onChange={(e) => setCatEditColor(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={catEditColor}
                      onChange={(e) => setCatEditColor(e.target.value)}
                      className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryModalMode("options")}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingCat}
                    className="flex-1 py-2.5 rounded-xl font-black text-black text-xs shadow-md hover:brightness-105 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: "#cfd500" }}
                  >
                    {isProcessingCat ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            )}

            {/* Modo 3: Confirmación de Eliminación */}
            {categoryModalMode === "delete" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    ¿Confirmas eliminar esta categoría?
                  </div>
                  <p>
                    Se deshabilitará la categoría <strong>"{selectedCategory.name}"</strong>. Si tiene productos existentes, no se romperá el inventario ni las ventas históricas.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryModalMode("options")}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingCat}
                    onClick={handleConfirmDeleteCategory}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessingCat ? "Eliminando..." : "Sí, Eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal: Confirmación de Eliminación de Producto */}
      {/* ==================================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base">Eliminar Producto</h3>
              </div>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-black text-slate-900 dark:text-white text-base">
                    {productToDelete.name}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-black shrink-0"
                    style={{ backgroundColor: productToDelete.category.color }}
                  >
                    {productToDelete.category.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Stock actual: <strong className="text-slate-800 dark:text-slate-200 font-bold">{productToDelete.stock}</strong>
                  </span>
                  <span>
                    Precio: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrency(productToDelete.salePrice)}</strong>
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  ¿Confirmas que deseas eliminar este producto?
                </div>
                <p>
                  El producto se retirará del catálogo y del punto de venta. Si cuenta con ventas o compras registradas, se dará de baja conservando la integridad de tus reportes contables.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  disabled={isDeletingProduct}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProduct}
                  disabled={isDeletingProduct}
                  className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 text-xs shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingProduct ? "Eliminando..." : "Sí, Eliminar Producto"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
