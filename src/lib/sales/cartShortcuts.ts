/**
 * Lógica pura de atajos de teclado y validación de cantidades para el Carrito del POS.
 */

export interface KeyboardResolutionParams {
  key: string;
  isInputOrInteractive: boolean;
  isAnyModalOpen: boolean;
  selectedProductId: string | null;
  cartProductIds: string[];
}

export type KeyboardAction =
  | { type: "IGNORE"; preventDefault: boolean }
  | { type: "DELETE_ITEM"; productId: string; preventDefault: boolean }
  | { type: "SET_QUANTITY_DIGIT"; productId: string; digit: string; preventDefault: boolean }
  | { type: "INCREMENT_QUANTITY"; productId: string; preventDefault: boolean }
  | { type: "DECREMENT_QUANTITY"; productId: string; preventDefault: boolean }
  | { type: "DESELECT"; preventDefault: boolean }
  | { type: "NAVIGATE_SELECTION"; nextProductId: string; preventDefault: boolean };

/**
 * Valida y ajusta la cantidad ingresada para un artículo.
 * - Debe ser un número entero positivo (> 0).
 * - En caso de estar vacío, ser negativo, cero o no numérico, retorna el fallback (cantidad actual).
 * - Respeta el inventario disponible: no permite cantidades mayores al stock.
 */
export function validateAndClampQuantity(
  rawValue: string | number,
  stock: number,
  fallbackQuantity: number = 1
): number {
  if (typeof rawValue === "number") {
    if (isNaN(rawValue) || !Number.isInteger(rawValue) || rawValue <= 0) {
      return fallbackQuantity;
    }
    return Math.max(1, Math.min(stock, rawValue));
  }

  const trimmed = rawValue.trim();
  if (trimmed === "") {
    return fallbackQuantity;
  }

  // Verificar que contenga solo dígitos
  if (!/^\d+$/.test(trimmed)) {
    return fallbackQuantity;
  }

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return fallbackQuantity;
  }

  // Respetar stock disponible (si stock es menor, ajustar al stock)
  return Math.max(1, Math.min(stock, parsed));
}

/**
 * Determina la acción a tomar ante un evento de teclado.
 * Asegura que no se interrumpa la escritura normal en inputs ni la navegación por defecto.
 */
export function resolveCartKeyboardAction(
  params: KeyboardResolutionParams
): KeyboardAction {
  const {
    key,
    isInputOrInteractive,
    isAnyModalOpen,
    selectedProductId,
    cartProductIds,
  } = params;

  // Si hay cualquier modal abierto, no interferir con atajos del carrito
  if (isAnyModalOpen) {
    return { type: "IGNORE", preventDefault: false };
  }

  // Si el usuario está escribiendo activamente dentro de cualquier input o formulario,
  // NO interceptar ni Delete ni Backspace ni teclas numéricas.
  if (isInputOrInteractive) {
    return { type: "IGNORE", preventDefault: false };
  }

  // Prevenir que Backspace retroceda la página en el navegador cuando no está en un input
  const isBackspace = key === "Backspace";
  const isDelete = key === "Delete";

  // Si no hay ningún artículo seleccionado o el carrito está vacío:
  if (!selectedProductId || cartProductIds.length === 0) {
    return {
      type: "IGNORE",
      preventDefault: isBackspace,
    };
  }

  // Si el producto seleccionado no existe en el carrito
  const currentIndex = cartProductIds.indexOf(selectedProductId);
  if (currentIndex === -1) {
    return {
      type: "IGNORE",
      preventDefault: isBackspace,
    };
  }

  // 1. Eliminar artículo seleccionado mediante Delete o Backspace
  if (isDelete || isBackspace) {
    return {
      type: "DELETE_ITEM",
      productId: selectedProductId,
      preventDefault: true,
    };
  }

  // 2. Ingreso numérico rápido cuando un artículo está seleccionado (dígitos 0 al 9)
  if (/^[0-9]$/.test(key)) {
    return {
      type: "SET_QUANTITY_DIGIT",
      productId: selectedProductId,
      digit: key,
      preventDefault: true,
    };
  }

  // 3. Atajos de incremento (+) y decremento (-)
  if (key === "+" || key === "Add") {
    return {
      type: "INCREMENT_QUANTITY",
      productId: selectedProductId,
      preventDefault: true,
    };
  }

  if (key === "-" || key === "Subtract") {
    return {
      type: "DECREMENT_QUANTITY",
      productId: selectedProductId,
      preventDefault: true,
    };
  }

  // 4. Deseleccionar con Escape
  if (key === "Escape") {
    return {
      type: "DESELECT",
      preventDefault: true,
    };
  }

  // 5. Navegación con flechas (ArrowUp / ArrowDown)
  if (key === "ArrowDown" || key === "ArrowUp") {
    const nextIndex =
      key === "ArrowDown"
        ? (currentIndex + 1) % cartProductIds.length
        : (currentIndex - 1 + cartProductIds.length) % cartProductIds.length;
    return {
      type: "NAVIGATE_SELECTION",
      nextProductId: cartProductIds[nextIndex],
      preventDefault: true,
    };
  }

  return { type: "IGNORE", preventDefault: false };
}

/**
 * Obtiene el ID del siguiente artículo a seleccionar tras eliminar un producto del carrito.
 */
export function getNextSelectedIdAfterRemoval(
  currentSelectedId: string | null,
  removedId: string,
  remainingCartIds: string[]
): string | null {
  if (currentSelectedId !== removedId) {
    return currentSelectedId;
  }
  if (remainingCartIds.length === 0) {
    return null;
  }
  return remainingCartIds[remainingCartIds.length - 1];
}
