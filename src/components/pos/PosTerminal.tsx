"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { ThermalTicket, TicketData } from "./ThermalTicket";
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
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Tag,
  Percent,
} from "lucide-react";
import { formatCurrency, roundMoney } from "@/lib/money";
import {
  calculateCart,
  validatePayments,
  DiscountType,
  PaymentMethod,
} from "@/lib/sales/calculations";
import {
  validateAndClampQuantity,
  resolveCartKeyboardAction,
  getNextSelectedIdAfterRemoval,
} from "@/lib/sales/cartShortcuts";
import {
  calculateCardCommission,
  calculateSaleProfitSummary,
  validateCommissionRate,
} from "@/lib/sales/commission";
import {
  openCashRegisterAction,
  completeSaleAction,
  createCashMovementAction,
} from "@/actions/pos";

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
  cardCommissionEnabled?: boolean;
  defaultCardCommissionRate?: number;
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
  cardCommissionEnabled = false,
  defaultCardCommissionRate = 0,
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

  // Selección y edición de cantidades mediante teclado
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isExternalNumericKeyRef = useRef(false);

  // Vista Móvil: 'catalog' | 'cart'
  const [mobileView, setMobileView] = useState<"catalog" | "cart">("catalog");

  // Cobro / Checkout Modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Comisión bancaria por pago con tarjeta para la venta actual
  const [currentSaleCommissionRate, setCurrentSaleCommissionRate] = useState<number>(
    defaultCardCommissionRate ?? 0
  );
  const [isCustomizingCommission, setIsCustomizingCommission] = useState(false);
  const [customCommissionInput, setCustomCommissionInput] = useState<string>(
    (defaultCardCommissionRate ?? 0).toString()
  );

  // Sincronizar tasa global por defecto si cambia y el cajero no la ha modificado para esta venta
  useEffect(() => {
    if (!isCustomizingCommission) {
      const rate = defaultCardCommissionRate ?? 0;
      setCurrentSaleCommissionRate(rate);
      setCustomCommissionInput(rate.toString());
    }
  }, [defaultCardCommissionRate, isCustomizingCommission]);
  const [saleSuccess, setSaleSuccess] = useState<{
    folio: string;
    total: number;
    changeGiven: number;
  } | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  // Monta el ticket de forma síncrona y abre el diálogo de impresión
  const printTicket = (data: TicketData) => {
    flushSync(() => setTicketData(data));
    window.print();
  };

  // Movimiento de Caja (Ingreso / Retiro)
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementFeedback, setMovementFeedback] = useState<{
    type: "success" | "error";
    message: string;
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

    // Limpiar edición temporal del producto si existía
    setEditingQuantities((prev) => {
      if (prev[product.id] === undefined) return prev;
      const next = { ...prev };
      delete next[product.id];
      return next;
    });

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

    setSelectedProductId(product.id);
  };

  // Modificar cantidad
  const updateQuantity = (productId: string, qty: number) => {
    setEditingQuantities((prev) => {
      if (prev[productId] === undefined) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });

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

  // Confirmar cantidad escrita en el teclado numérico
  const commitQuantity = (productId: string) => {
    const rawVal = editingQuantities[productId];
    setEditingQuantities((prev) => {
      if (prev[productId] === undefined) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    if (rawVal === undefined) return;

    const currentItem = cart.find((i) => i.product.id === productId);
    if (!currentItem) return;

    const validatedQty = validateAndClampQuantity(
      rawVal,
      currentItem.product.stock,
      currentItem.quantity
    );

    updateQuantity(productId, validatedQty);
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
    setCart((prev) => {
      const remaining = prev.filter((item) => item.product.id !== productId);
      setSelectedProductId((currentSelected) => {
        return getNextSelectedIdAfterRemoval(
          currentSelected,
          productId,
          remaining.map((i) => i.product.id)
        );
      });
      return remaining;
    });
    setEditingQuantities((prev) => {
      if (prev[productId] === undefined) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedProductId(null);
    setEditingQuantities({});
    setGlobalDiscountType(null);
    setGlobalDiscountValue(0);
    setCurrentSaleCommissionRate(defaultCardCommissionRate ?? 0);
    setIsCustomizingCommission(false);
    setCustomCommissionInput((defaultCardCommissionRate ?? 0).toString());
  };

  // Manejo de atajos de teclado globales para el Carrito
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputOrInteractive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      const isAnyModalOpen =
        openingModalOpen || checkoutModalOpen || movementModalOpen;

      const cartProductIds = cart.map((i) => i.product.id);

      const resolved = resolveCartKeyboardAction({
        key: e.key,
        isInputOrInteractive,
        isAnyModalOpen,
        selectedProductId,
        cartProductIds,
      });

      if (resolved.preventDefault) {
        e.preventDefault();
      }

      switch (resolved.type) {
        case "DELETE_ITEM":
          removeFromCart(resolved.productId);
          break;

        case "SET_QUANTITY_DIGIT": {
          const inputEl = quantityInputRefs.current[resolved.productId];
          if (inputEl) {
            isExternalNumericKeyRef.current = true;
            setEditingQuantities((prev) => ({
              ...prev,
              [resolved.productId]: resolved.digit,
            }));
            inputEl.focus();
            setTimeout(() => {
              isExternalNumericKeyRef.current = false;
              inputEl.setSelectionRange(
                inputEl.value.length,
                inputEl.value.length
              );
            }, 0);
          }
          break;
        }

        case "INCREMENT_QUANTITY": {
          const target = cart.find((i) => i.product.id === resolved.productId);
          if (target) {
            updateQuantity(resolved.productId, target.quantity + 1);
          }
          break;
        }

        case "DECREMENT_QUANTITY": {
          const target = cart.find((i) => i.product.id === resolved.productId);
          if (target) {
            updateQuantity(resolved.productId, target.quantity - 1);
          }
          break;
        }

        case "DESELECT":
          setSelectedProductId(null);
          break;

        case "NAVIGATE_SELECTION":
          setSelectedProductId(resolved.nextProductId);
          break;

        case "IGNORE":
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedProductId,
    cart,
    openingModalOpen,
    checkoutModalOpen,
    movementModalOpen,
    editingQuantities,
  ]);

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

  // Monto a cubrir en efectivo calculado de forma fija y automática (No editable)
  const cashToCover = useMemo(() => {
    const cardVal = parseFloat(cardAmount) || 0;
    const transVal = parseFloat(transferAmount) || 0;
    return Math.max(0, roundMoney(cartCalculation.total - cardVal - transVal));
  }, [cartCalculation.total, cardAmount, transferAmount]);

  // Apertura de modal de cobro
  const openCheckout = () => {
    // Confirmar cualquier edición pendiente antes de abrir el modal
    Object.keys(editingQuantities).forEach((productId) => {
      commitQuantity(productId);
    });

    if (cart.length === 0) return;
    setSaleError(null);
    setCardAmount("");
    setTransferAmount("");
    // Por defecto sugerir efectivo recibido igual al total de la venta
    setCashReceived(cartCalculation.total.toString());
    if (!isCustomizingCommission) {
      const rate = defaultCardCommissionRate ?? 0;
      setCurrentSaleCommissionRate(rate);
      setCustomCommissionInput(rate.toString());
    }
    setCheckoutModalOpen(true);
  };

  // Validación de pagos en checkout
  const currentPayments = useMemo(() => {
    const paymentsList = [];
    const cardVal = parseFloat(cardAmount) || 0;
    const transVal = parseFloat(transferAmount) || 0;
    const cashVal = cashToCover;
    const cashRecVal = cashReceived !== "" ? (parseFloat(cashReceived) || 0) : cashVal;

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
    if (cashVal > 0 || (cardVal === 0 && transVal === 0)) {
      paymentsList.push({
        method: "CASH" as PaymentMethod,
        amount: cashVal,
        receivedAmount: cashRecVal,
      });
    }
    return paymentsList;
  }, [cashToCover, cashReceived, cardAmount, transferAmount]);

  const paymentValidation = useMemo(() => {
    return validatePayments(cartCalculation.total, currentPayments);
  }, [cartCalculation.total, currentPayments]);

  // Manejo de modificación de comisión para la venta actual (sin afectar configuración global)
  const handleSaleCommissionRateChange = (val: string) => {
    setCustomCommissionInput(val);
    setIsCustomizingCommission(true);
    const validated = validateCommissionRate(val);
    if (validated.isValid) {
      setCurrentSaleCommissionRate(validated.parsedRate);
    }
  };

  const handleResetCommissionToDefault = () => {
    const defaultRate = defaultCardCommissionRate ?? 0;
    setCurrentSaleCommissionRate(defaultRate);
    setCustomCommissionInput(defaultRate.toString());
    setIsCustomizingCommission(false);
  };

  // Indicador si algún producto tiene costo no registrado o igual a $0.00
  const hasIncompleteCost = useMemo(() => {
    return cart.some((item) => Number(item.product.currentCost) <= 0);
  }, [cart]);

  // Cálculo de comisión por pago con tarjeta
  const cardCommission = useMemo(() => {
    const cardVal = parseFloat(cardAmount) || 0;
    return calculateCardCommission({
      cardAmount: cardVal,
      rate: currentSaleCommissionRate,
      isEnabled: cardCommissionEnabled || isCustomizingCommission,
    });
  }, [cardAmount, currentSaleCommissionRate, cardCommissionEnabled, isCustomizingCommission]);

  // Resumen de Ganancia Real Estimada
  const saleProfitSummary = useMemo(() => {
    return calculateSaleProfitSummary({
      totalSale: cartCalculation.total,
      totalCost: cartCalculation.totalCost,
      cardCommissionAmount: cardCommission.commissionAmount,
      hasIncompleteCost,
    });
  }, [
    cartCalculation.total,
    cartCalculation.totalCost,
    cardCommission.commissionAmount,
    hasIncompleteCost,
  ]);

  // Mostrar apartado informativo de comisión cuando el método tarjeta tenga monto y esté activado/personalizado
  const showCardCommissionSection =
    (parseFloat(cardAmount) || 0) > 0 &&
    (cardCommissionEnabled || isCustomizingCommission || currentSaleCommissionRate > 0);

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

  // Confirmar movimiento de caja (Ingreso o Retiro)
  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashRegister) return;
    setMovementFeedback(null);

    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      setMovementFeedback({ type: "error", message: "La cantidad debe ser mayor a cero." });
      return;
    }

    const reason = movementReason.trim();
    if (!reason) {
      setMovementFeedback({ type: "error", message: "El motivo del movimiento es obligatorio." });
      return;
    }

    if (movementType === "WITHDRAWAL" && amount > Number(cashRegister.expectedCash)) {
      setMovementFeedback({
        type: "error",
        message: `El monto del retiro (${formatCurrency(amount)}) supera el efectivo disponible en caja (${formatCurrency(Number(cashRegister.expectedCash))}).`,
      });
      return;
    }

    setIsSubmittingMovement(true);
    try {
      await createCashMovementAction({
        cashRegisterId: cashRegister.id,
        type: movementType,
        amount,
        reason,
      });

      const newExpected =
        movementType === "DEPOSIT"
          ? Number(cashRegister.expectedCash) + amount
          : Number(cashRegister.expectedCash) - amount;

      setCashRegister({
        ...cashRegister,
        expectedCash: newExpected,
      });

      setMovementFeedback({
        type: "success",
        message:
          movementType === "DEPOSIT"
            ? `Ingreso de ${formatCurrency(amount)} registrado exitosamente.`
            : `Retiro de ${formatCurrency(amount)} registrado exitosamente.`,
      });
      setMovementAmount("");
      setMovementReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar movimiento";
      setMovementFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // Confirmar venta
  const handleConfirmSale = async (withTicket: boolean) => {
    if (!paymentValidation.isValid || isSubmittingSale) return;

    // Snapshot del carrito antes de limpiarlo (para el ticket)
    const ticketItems = cartCalculation.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      amount: i.subtotal,
    }));
    const saleTotal = cartCalculation.total;
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
        cardCommissionRate: cardCommission.rateApplied,
      });

      setSaleSuccess({
        folio: result.folio,
        total: saleTotal,
        changeGiven: result.changeGiven,
      });
      clearCart();

      const data: TicketData = {
        folio: result.folio,
        date: new Date(),
        items: ticketItems,
        total: saleTotal,
      };
      if (withTicket) {
        printTicket(data);
      } else {
        setTicketData(data); // disponible para reimpresión opcional
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al procesar la venta";
      setSaleError(msg);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const totalCartItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Selector Móvil de Vista (Catálogo vs Carrito) */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileView("catalog")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileView === "catalog"
              ? "bg-black text-[#cfd500] shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Catálogo ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("cart")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileView === "cart"
              ? "bg-black text-[#cfd500] shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Carrito ({totalCartItems})</span>
          {totalCartItems > 0 && (
            <span className="ml-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              · {formatCurrency(cartCalculation.total)}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* Columna Izquierda: Catálogo y Búsqueda */}
      {/* ==================================================================== */}
      <div className={`flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden ${mobileView === "catalog" ? "flex" : "hidden lg:flex"}`}>
        {/* Barra superior de búsqueda y filtros */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
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

            <button
              type="button"
              onClick={() => {
                setMovementFeedback(null);
                setMovementModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-[#cfd500] hover:text-black dark:hover:text-[#cfd500] transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Registrar ingreso o retiro de efectivo en caja"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#cfd500]" />
              <span className="hidden sm:inline">Movimiento de caja</span>
              <span className="sm:hidden">Mov. caja</span>
            </button>
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
        <div className="flex-1 overflow-y-auto p-4 pb-36 lg:pb-4">
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

        {/* Barra Flotante Móvil cuando hay productos en el carrito */}
        {cart.length > 0 && mobileView === "catalog" && (
          <div className="fixed left-3 right-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 lg:hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-[#cfd500] font-black shrink-0">
                  {totalCartItems}
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total en Carrito</div>
                  <div className="text-base font-black text-[#cfd500]">
                    {formatCurrency(cartCalculation.total)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileView("cart")}
                className="py-2.5 px-4 rounded-xl font-black text-black text-xs shadow-md flex items-center gap-1.5 shrink-0 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                style={{ backgroundColor: "#cfd500" }}
              >
                <span>Ver Carrito / Cobrar</span>
                <DollarSign className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* Columna Derecha: Carrito y Totales */}
      {/* ==================================================================== */}
      <div className={`w-full lg:w-96 xl:w-[420px] bg-white dark:bg-slate-900 flex flex-col h-full shadow-lg overflow-hidden ${mobileView === "cart" ? "flex" : "hidden lg:flex"}`}>
        {/* Cabecera del Carrito */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="lg:hidden pb-1 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMobileView("catalog")}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer py-1"
            >
              <span>← Seguir agregando productos del catálogo</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h2 className="font-black text-base text-slate-800 dark:text-slate-100">
                Carrito ({totalCartItems})
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
      </div>

        {/* Lista de Partidas en Carrito */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          onClick={() => setSelectedProductId(null)}
        >
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-12">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
              <span>El carrito está vacío.</span>
              <span className="text-xs text-slate-400 mt-1">
                Haz clic en productos para agregarlos.
              </span>
              <button
                type="button"
                onClick={() => setMobileView("catalog")}
                className="mt-4 px-4 py-2 rounded-xl bg-black text-[#cfd500] font-black text-xs lg:hidden cursor-pointer shadow-xs hover:brightness-125"
              >
                Ir al catálogo de productos
              </button>
            </div>
          ) : (
            cartCalculation.items.map((item) => {
              const rawCartItem = cart.find((i) => i.product.id === item.productId)!;
              const isSelected = selectedProductId === item.productId;
              const displayQuantity =
                editingQuantities[item.productId] !== undefined
                  ? editingQuantities[item.productId]
                  : item.quantity.toString();

              return (
                <div
                  key={item.productId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductId(item.productId);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  data-selected={isSelected}
                  className={`p-3 rounded-xl border text-sm transition-all outline-none cursor-pointer select-none ${
                    isSelected
                      ? "ring-2 ring-[#cfd500] dark:ring-[#cfd500] border-transparent shadow-md bg-yellow-50/40 dark:bg-yellow-950/20"
                      : item.isLoss
                      ? "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{item.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#cfd500] text-black">
                            Seleccionado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Orig: {formatCurrency(item.originalPrice)} · Costo:{" "}
                        {formatCurrency(item.unitCost)} · Disp: {rawCartItem.product.stock}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.productId);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Eliminar artículo (Delete o Backspace)"
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
                  <div
                    className="grid grid-cols-2 gap-2 mb-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                        title="Disminuir unidades"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        ref={(el) => {
                          quantityInputRefs.current[item.productId] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={displayQuantity}
                        onFocus={(e) => {
                          setSelectedProductId(item.productId);
                          if (!isExternalNumericKeyRef.current) {
                            e.target.select();
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.currentTarget.select();
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setEditingQuantities((prev) => ({
                            ...prev,
                            [item.productId]: val,
                          }));
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setEditingQuantities((prev) => {
                              const next = { ...prev };
                              delete next[item.productId];
                              return next;
                            });
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={() => {
                          commitQuantity(item.productId);
                        }}
                        className="w-12 h-7 text-center font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:border-[#cfd500] focus:ring-2 focus:ring-[#cfd500] transition-all"
                        aria-label={`Cantidad de ${item.name}`}
                        title="Escribe la cantidad deseada con el teclado numérico"
                      />

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                        title="Incrementar unidades"
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
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 space-y-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-4 shrink-0">
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
              {hasIncompleteCost && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  * Costo parcial: algunos productos sin costo de adquisición registrado
                </div>
              )}
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

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:block">
                <div className="text-xs font-bold text-slate-500 uppercase">Total a Cobrar</div>
                <div className="font-black text-2xl text-slate-900 dark:text-white">
                  {formatCurrency(cartCalculation.total)}
                </div>
              </div>

              <button
                onClick={openCheckout}
                disabled={cartCalculation.isNetLoss && !allowBelowCostSales}
                className={`w-full sm:w-auto py-3.5 px-8 rounded-xl font-black text-black text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 text-slate-800 dark:text-slate-100 max-h-[92dvh] overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
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
                {ticketData && (
                  <button
                    onClick={() => printTicket(ticketData)}
                    className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Imprimir ticket
                  </button>
                )}
                <button
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    setSaleSuccess(null);
                    setTicketData(null);
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                          <span>Monto a Cubrir</span>
                          <span className="text-[9px] font-semibold text-slate-400 lowercase">(no editable)</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          tabIndex={-1}
                          value={formatCurrency(cashToCover)}
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-sm text-slate-700 dark:text-slate-300 cursor-not-allowed select-none focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">
                            Efectivo Recibido
                          </label>
                          <button
                            type="button"
                            onClick={() => setCashReceived(cashToCover > 0 ? cashToCover.toString() : "")}
                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white underline cursor-pointer"
                          >
                            Exacto
                          </button>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-sm focus:ring-2 focus:ring-[#cfd500] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        <span>Tarjeta (Débito/Crédito)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const transVal = parseFloat(transferAmount) || 0;
                          const remaining = Math.max(0, roundMoney(cartCalculation.total - transVal));
                          setCardAmount(remaining.toString());
                        }}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Cubrir Total
                      </button>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        placeholder="Monto con tarjeta"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm focus:ring-2 focus:ring-[#cfd500] focus:outline-hidden"
                      />
                    </div>

                    {/* Apartado informativo de Comisión por Tarjeta */}
                    {showCardCommissionSection && (
                      <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            Comisión de Terminal
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              % para esta venta:
                            </span>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={customCommissionInput}
                                onChange={(e) => handleSaleCommissionRateChange(e.target.value)}
                                className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-xs font-black text-right pr-4 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                                title="Modificar porcentaje para esta venta"
                              />
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                                %
                              </span>
                            </div>
                            {isCustomizingCommission && (
                              <button
                                type="button"
                                onClick={handleResetCommissionToDefault}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                title={`Restablecer al porcentaje predeterminado (${defaultCardCommissionRate}%)`}
                              >
                                Restablecer
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Importe Tarjeta</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(cardCommission.cardAmount)}</span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Comisión ({cardCommission.rateApplied}%)</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">-{formatCurrency(cardCommission.commissionAmount)}</span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50 sm:col-span-2">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Neto Recibido</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(cardCommission.netReceived)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transferencia */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <ArrowRightLeft className="w-4 h-4 text-purple-500" />
                        <span>Transferencia Bancaria</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cardVal = parseFloat(cardAmount) || 0;
                          const remaining = Math.max(0, roundMoney(cartCalculation.total - cardVal));
                          setTransferAmount(remaining.toString());
                        }}
                        className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        Cubrir Total
                      </button>
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

                {/* Resumen de Ganancia Real Estimada de la Venta */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      Ganancia Real Estimada
                    </span>
                    {saleProfitSummary.hasIncompleteCost && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Estimación Parcial
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Total de la venta:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(saleProfitSummary.totalSale)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Costo de adquisición de productos:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(saleProfitSummary.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Ganancia antes de comisión bancaria:</span>
                      <span
                        className={
                          saleProfitSummary.profitBeforeCommission < 0
                            ? "text-red-500 font-bold"
                            : "text-slate-900 dark:text-slate-100 font-bold"
                        }
                      >
                        {formatCurrency(saleProfitSummary.profitBeforeCommission)}
                      </span>
                    </div>
                    {cardCommission.hasCommission && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400 font-semibold">
                        <span>Comisión bancaria estimada ({cardCommission.rateApplied}%):</span>
                        <span>-{formatCurrency(saleProfitSummary.cardCommissionAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700 font-black">
                      <span className="text-slate-900 dark:text-white">
                        {cardCommission.hasCommission
                          ? "Ganancia después de comisión bancaria:"
                          : "Ganancia neta estimada:"}
                      </span>
                      <span
                        className={`text-base ${
                          saleProfitSummary.profitAfterCommission < 0
                            ? "text-red-500"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrency(saleProfitSummary.profitAfterCommission)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    * Ganancia estimada después del costo de productos y comisión bancaria, antes de otros gastos operativos o impuestos.
                    {saleProfitSummary.hasIncompleteCost &&
                      " Nota: uno o más productos tienen costo no registrado ($0.00)."}
                  </p>
                </div>

                {/* Botones de Acción */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleConfirmSale(true)}
                      disabled={!paymentValidation.isValid || isSubmittingSale}
                      className="py-3.5 rounded-xl font-black text-black text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-40"
                      style={{ backgroundColor: "#cfd500" }}
                    >
                      {isSubmittingSale ? "Procesando..." : "Confirmar con ticket"}
                    </button>
                    <button
                      onClick={() => handleConfirmSale(false)}
                      disabled={!paymentValidation.isValid || isSubmittingSale}
                      className="py-3.5 rounded-xl font-black text-sm shadow-md bg-black text-[#cfd500] hover:brightness-125 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      {isSubmittingSale ? "Procesando..." : "Confirmar sin ticket"}
                    </button>
                  </div>
                  <button
                    onClick={() => setCheckoutModalOpen(false)}
                    className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Modal de Movimiento de Caja (Ingreso / Retiro sin salir de Ventas) */}
      {/* ==================================================================== */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black shadow-xs shrink-0"
                  style={{ backgroundColor: "#cfd500" }}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">Movimiento de Caja</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ajuste físico de efectivo en caja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMovementModalOpen(false);
                  setMovementFeedback(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {movementFeedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
                  movementFeedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                {movementFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{movementFeedback.message}</span>
              </div>
            )}

            {!cashRegister ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No hay una caja abierta actualmente. Para registrar movimientos de efectivo, primero debes abrir caja.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMovementModalOpen(false);
                    setOpeningModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#cfd500] text-black shadow-sm hover:brightness-105 cursor-pointer"
                >
                  Abrir Caja Ahora
                </button>
              </div>
            ) : (
              <form onSubmit={handleCashMovement} className="space-y-4">
                {/* Selector Tipo de Movimiento */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType("DEPOSIT");
                      setMovementFeedback(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      movementType === "DEPOSIT"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Ingreso de dinero</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovementType("WITHDRAWAL");
                      setMovementFeedback(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      movementType === "WITHDRAWAL"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Retiro de dinero</span>
                  </button>
                </div>

                {/* Info de Efectivo Actual */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-slate-500 dark:text-slate-400">Efectivo disponible en caja:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {formatCurrency(cashRegister.expectedCash)}
                  </span>
                </div>

                {/* Campo Cantidad */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Cantidad a {movementType === "DEPOSIT" ? "ingresar" : "retirar"} ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-base text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Campo Motivo */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Motivo del {movementType === "DEPOSIT" ? "ingreso" : "retiro"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      movementType === "DEPOSIT"
                        ? "Ej. Fondo adicional de cambio, reintegro..."
                        : "Ej. Retiro parcial para resguardo, pago de paquetería..."
                    }
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#cfd500]"
                  />
                </div>

                {/* Nota explicativa de utilidad neta */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 <span className="font-bold">Aviso contable:</span> Este movimiento ajusta el arqueo físico en caja y <span className="font-bold text-slate-700 dark:text-slate-300">no disminuye ni incrementa la utilidad neta</span> del negocio.
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementModalOpen(false);
                      setMovementFeedback(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMovement}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                      movementType === "DEPOSIT"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {isSubmittingMovement
                      ? "Registrando..."
                      : movementType === "DEPOSIT"
                      ? "Confirmar Ingreso"
                      : "Confirmar Retiro"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Ticket térmico (sólo visible al imprimir) */}
      <ThermalTicket data={ticketData} />
    </div>
  );
}
