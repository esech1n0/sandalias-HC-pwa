"use client";

import { useState, useMemo, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  CheckCircle2,
  DollarSign,
  Tag,
} from "lucide-react";
import { formatCurrency } from "@/lib/money";
import {
  calculateCart,
  validatePayments,
  DiscountType,
  PaymentMethod,
} from "@/lib/sales/calculations";
import { openCashRegisterAction, completeSaleAction } from "@/actions/pos";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  salePrice: number;
  currentCost: number;
  stock: number;
  minStock: number;
  imageUrl?: string | null;
  category: Category;
}

interface PosTerminalProps {
  products: Product[];
  categories: Category[];
  activeCashRegister: { id: string; openingBalance: number; expectedCash: number } | null;
  allowBelowCostSales?: boolean;
}

interface CartItemState {
  product: Product;
  quantity: number;
  customPrice: number | null;
  discountType: DiscountType | null;
  discountValue: number;
}

export function PosTerminal({
  products,
  categories,
  activeCashRegister,
  allowBelowCostSales = true,
}: PosTerminalProps) {
  // Estado de Caja Abierta
  const [cashRegister, setCashRegister] = useState(activeCashRegister);
  const [openingModalOpen, setOpeningModalOpen] = useState(!activeCashRegister);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("1000");
  const [isOpeningRegister, setIsOpeningRegister] = useState(false);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carrito
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType | null>(null);
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Cobro / Checkout Modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState<{
    folio: string;
    total: number;
    changeGiven: number;
  } | null>(null);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Manejo de Enter en la barra de búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  // Agregar al carrito
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // No superar stock disponible
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          customPrice: null,
          discountType: null,
          discountValue: 0,
        },
      ];
    });
  };

  // Modificar cantidad
  const updateQuantity = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const validQty = Math.max(0, Math.min(item.product.stock, qty));
            return { ...item, quantity: validQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Modificar precio personalizado por producto
  const updateCustomPrice = (productId: string, price: number | null) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, customPrice: price } : item
      )
    );
  };

  // Modificar descuento unitario
  const updateItemDiscount = (
    productId: string,
    type: DiscountType | null,
    val: number
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, discountType: type, discountValue: val }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setGlobalDiscountType(null);
    setGlobalDiscountValue(0);
  };

  // Cálculo del carrito
  const cartCalculation = useMemo(() => {
    const inputItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      originalPrice: Number(item.product.salePrice),
      customPrice: item.customPrice,
      unitCost: Number(item.product.currentCost),
      quantity: item.quantity,
      discountType: item.discountType,
      discountValue: item.discountValue,
    }));

    return calculateCart(
      inputItems,
      globalDiscountType ? { type: globalDiscountType, value: globalDiscountValue } : null
    );
  }, [cart, globalDiscountType, globalDiscountValue]);

  // Apertura de modal de cobro
  const openCheckout = () => {
    if (cart.length === 0) return;
    setSaleError(null);
    // Por defecto sugerir efectivo exacto
    setCashAmount(cartCalculation.total.toString());
    setCashReceived(cartCalculation.total.toString());
    setCardAmount("");
    setTransferAmount("");
    setCheckoutModalOpen(true);
  };

  // Validación de pagos en checkout
  const currentPayments = useMemo(() => {
    const paymentsList = [];
    const cashVal = parseFloat(cashAmount) || 0;
    const cashRecVal = parseFloat(cashReceived) || cashVal;
    const cardVal = parseFloat(cardAmount) || 0;
    const transVal = parseFloat(transferAmount) || 0;

    if (cashVal > 0) {
      paymentsList.push({
        method: "CASH" as PaymentMethod,
        amount: cashVal,
        receivedAmount: cashRecVal,
      });
    }
    if (cardVal > 0) {
      paymentsList.push({
        method: "CARD" as PaymentMethod,
        amount: cardVal,
      });
    }
    if (transVal > 0) {
      paymentsList.push({
        method: "TRANSFER" as PaymentMethod,
        amount: transVal,
      });
    }
    return paymentsList;
  }, [cashAmount, cashReceived, cardAmount, transferAmount]);

  const paymentValidation = useMemo(() => {
    return validatePayments(cartCalculation.total, currentPayments);
  }, [cartCalculation.total, currentPayments]);

  // Confirmar apertura de caja
  const handleOpenRegister = async () => {
    const amount = parseFloat(openingBalanceInput);
    if (isNaN(amount) || amount < 0) return;
    setIsOpeningRegister(true);
    try {
      const reg = await openCashRegisterAction(amount);
      setCashRegister({
        id: reg.id,
        openingBalance: Number(reg.openingBalance),
        expectedCash: Number(reg.expectedCash),
      });
      setOpeningModalOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al abrir caja";
      alert(msg);
    } finally {
      setIsOpeningRegister(false);
    }
  };

  // Confirmar venta
  const handleConfirmSale = async () => {
    if (!paymentValidation.isValid) return;
    setIsSubmittingSale(true);
    setSaleError(null);

    try {
      const result = await completeSaleAction({
        items: cart.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          originalPrice: Number(i.product.salePrice),
          customPrice: i.customPrice,
          unitCost: Number(i.product.currentCost),
          quantity: i.quantity,
          discountType: i.discountType,
          discountValue: i.discountValue,
        })),
        payments: currentPayments,
        cartDiscount: globalDiscountType
          ? { type: globalDiscountType, value: globalDiscountValue }
          : null,
      });

      setSaleSuccess({
        folio: result.folio,
        total: cartCalculation.total,
        changeGiven: result.changeGiven,
      });
      clearCart();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al procesar la venta";
      setSaleError(msg);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* ==================================================================== */}
      {/* Columna Izquierda: Catálogo y Búsqueda */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Barra superior de búsqueda y filtros */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar producto por nombre... (Enter para agregar)"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-[#cfd500] dark:text-white"
            />
          </div>

          {/* Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                selectedCategory === "ALL"
                  ? "bg-black text-[#cfd500] shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105"
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  selectedCategory === cat.id
                    ? "bg-black text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Cuadrícula de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <span>No se encontraron productos coincidentes.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock < p.minStock && p.stock > 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                      isOutOfStock
                        ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#cfd500] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]"
                    }`}
                  >
                    {/* Badge de Categoría con su color */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-black tracking-wide"
                        style={{ backgroundColor: p.category.color }}
                      >
                        {p.category.name}
                      </span>
                      {isLowStock && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Stock bajo
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 mb-2">
                      {p.name}
                    </div>

                    <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-400">Precio</div>
                        <div className="font-black text-base text-slate-900 dark:text-white">
                          {formatCurrency(p.salePrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Stock</div>
                        <div
                          className={`text-xs font-bold ${
                            isOutOfStock
                              ? "text-red-500"
                              : isLowStock
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {p.stock}
                        </div>
                      </div>
                    </div>

                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black text-[#cfd500] font-black text-xs flex items-center justify-center">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Columna Derecha: Carrito y Totales */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white dark:bg-slate-900 flex flex-col h-full shadow-lg">
        {/* Cabecera del Carrito */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
              Carrito ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {cashRegister && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Caja activa
              </span>
            )}
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Partidas en Carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <span>El carrito está vacío.</span>
              <span className="text-xs text-slate-400 mt-1">
                Haz clic en productos para agregarlos.
              </span>
            </div>
          ) : (
            cartCalculation.items.map((item) => {
              const rawCartItem = cart.find((i) => i.product.id === item.productId)!;

              return (
                <div
                  key={item.productId}
                  className={`p-3 rounded-xl border text-sm transition-all ${
                    item.isLoss
                      ? "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Orig: {formatCurrency(item.originalPrice)} · Costo:{" "}
                        {formatCurrency(item.unitCost)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Advertencia de utilidad negativa */}
                  {item.isLoss && (
                    <div className="mb-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Venta con pérdida de {formatCurrency(Math.abs(item.profit))}</span>
                    </div>
                  )}

                  {/* Controles de Precio Personalizado y Descuento */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={rawCartItem.customPrice ?? item.unitPrice}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value);
                          updateCustomPrice(item.productId, val);
                        }}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Desc. ($)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={rawCartItem.discountValue || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateItemDiscount(item.productId, "FIXED_AMOUNT", val);
                        }}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Selector de Cantidad y Subtotal */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-black text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-base text-slate-900 dark:text-white">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resumen de Totales y Descuento Global */}
        {cart.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {/* Descuento Global del Carrito */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Descuento Carrito:
              </span>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  placeholder="0"
                  value={globalDiscountValue || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setGlobalDiscountValue(val);
                    if (!globalDiscountType) setGlobalDiscountType("FIXED_AMOUNT");
                  }}
                  className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-right"
                />
                <button
                  onClick={() =>
                    setGlobalDiscountType(
                      globalDiscountType === "PERCENTAGE" ? "FIXED_AMOUNT" : "PERCENTAGE"
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  {globalDiscountType === "PERCENTAGE" ? "%" : "$"}
                </button>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(cartCalculation.itemsSubtotal)}</span>
              </div>
              {cartCalculation.cartDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>Descuento aplicado:</span>
                  <span>-{formatCurrency(cartCalculation.cartDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Costo estimado:</span>
                <span>{formatCurrency(cartCalculation.totalCost)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Utilidad bruta:</span>
                <span className={cartCalculation.isNetLoss ? "text-red-500" : "text-emerald-600"}>
                  {formatCurrency(cartCalculation.grossProfit)}
                </span>
              </div>
            </div>

            {cartCalculation.isNetLoss && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  allowBelowCostSales
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {allowBelowCostSales
                    ? "Advertencia: Esta venta genera utilidad negativa (permitido según configuración)."
                    : "Bloqueado: La venta genera utilidad negativa y está restringida por configuración."}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Total a Cobrar</div>
                <div className="font-black text-2xl text-slate-900 dark:text-white">
                  {formatCurrency(cartCalculation.total)}
                </div>
              </div>

              <button
                onClick={openCheckout}
                disabled={cartCalculation.isNetLoss && !allowBelowCostSales}
                className={`py-3 px-6 rounded-xl font-black text-black text-sm shadow-md transition-all flex items-center gap-2 ${
                  cartCalculation.isNetLoss && !allowBelowCostSales
                    ? "opacity-40 cursor-not-allowed bg-slate-300"
                    : "hover:brightness-105 active:scale-[0.98]"
                }`}
                style={{
                  backgroundColor:
                    cartCalculation.isNetLoss && !allowBelowCostSales ? undefined : "#cfd500",
                }}
              >
                <span>Cobrar</span>
                <DollarSign className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Modal Obligatorio de Apertura de Caja (Fondo Inicial) */}
      {/* ==================================================================== */}
      {openingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-4 text-black"
              style={{ backgroundColor: "#cfd500" }}
            >
              $
            </div>
            <h3 className="font-black text-xl mb-1">Apertura de Caja Requerida</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Para comenzar a operar y registrar ventas en el sistema, debes ingresar el fondo inicial de efectivo en caja.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                  Fondo Inicial (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    placeholder="1000.00"
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black text-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#cfd500] focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleOpenRegister}
                disabled={isOpeningRegister || parseFloat(openingBalanceInput) < 0}
                className="w-full py-3.5 rounded-xl font-black text-black text-sm tracking-wide shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "#cfd500" }}
              >
                {isOpeningRegister ? "Aperturando..." : "Aceptar y Abrir Caja"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal de Cobro y Métodos de Pago */}
      {/* ==================================================================== */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            {saleSuccess ? (
              // Pantalla de Venta Exitosa
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-black text-2xl">¡Venta Registrada!</h3>
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Folio:</span>
                    <span className="font-mono font-bold">{saleSuccess.folio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Venta:</span>
                    <span className="font-bold">{formatCurrency(saleSuccess.total)}</span>
                  </div>
                  {saleSuccess.changeGiven > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold text-base pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span>Cambio a Entregar:</span>
                      <span>{formatCurrency(saleSuccess.changeGiven)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    setSaleSuccess(null);
                  }}
                  className="w-full py-3.5 rounded-xl font-black text-black text-sm tracking-wide shadow-md hover:brightness-105 transition-all"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  Nueva Venta
                </button>
              </div>
            ) : (
              // Formulario de Cobro
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="font-black text-lg">Cobro de Venta</h3>
                    <p className="text-xs text-slate-500">Selecciona o combina los métodos de pago</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400">Total a Pagar</div>
                    <div className="font-black text-2xl text-slate-900 dark:text-white">
                      {formatCurrency(cartCalculation.total)}
                    </div>
                  </div>
                </div>

                {saleError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{saleError}</span>
                  </div>
                )}

                {/* Métodos de Pago */}
                <div className="space-y-4 mb-6">
                  {/* Efectivo */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Efectivo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Monto a Cubrir
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Efectivo Recibido
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      <span>Tarjeta (Débito/Crédito)</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="Monto con tarjeta"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Transferencia */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                      <span>Transferencia Bancaria</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Monto por transferencia"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Estado del Pago: Faltante, Exacto o Cambio */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-2 mb-6">
                  {paymentValidation.status === "PENDING" && (
                    <div className="flex justify-between items-center text-red-600 font-bold">
                      <span>Faltante por pagar:</span>
                      <span className="text-lg">
                        {formatCurrency(paymentValidation.remainingBalance)}
                      </span>
                    </div>
                  )}

                  {paymentValidation.status === "EXACT" && (
                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                      <span>Pago exacto:</span>
                      <span className="text-lg">$0.00</span>
                    </div>
                  )}

                  {paymentValidation.status === "CHANGE" && (
                    <div className="flex justify-between items-center text-emerald-600 font-black">
                      <span>Cambio a entregar:</span>
                      <span className="text-xl">
                        {formatCurrency(paymentValidation.changeGiven)}
                      </span>
                    </div>
                  )}

                  {paymentValidation.status === "INVALID" && (
                    <div className="text-red-500 text-xs font-bold">
                      {paymentValidation.errorMessage}
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckoutModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirmSale}
                    disabled={!paymentValidation.isValid || isSubmittingSale}
                    className="flex-2 py-3.5 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105 transition-all disabled:opacity-40"
                    style={{ backgroundColor: "#cfd500" }}
                  >
                    {isSubmittingSale ? "Procesando Venta..." : "Confirmar y Cobrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
