import { describe, it, expect } from "vitest";
import {
  validateAndClampQuantity,
  resolveCartKeyboardAction,
  getNextSelectedIdAfterRemoval,
} from "@/lib/sales/cartShortcuts";
import { calculateCart } from "@/lib/sales/calculations";

describe("Atajos de teclado y gestión de cantidades en módulo Venta (POS)", () => {
  describe("1. Ingreso y validación de cantidades mediante teclado", () => {
    it("Debe permitir cambiar la cantidad a 5 cuando el stock es suficiente", () => {
      const stock = 20;
      const result = validateAndClampQuantity("5", stock, 1);
      expect(result).toBe(5);
    });

    it("Debe permitir introducir cantidades de varios dígitos como 15 o 100", () => {
      const stock = 200;
      expect(validateAndClampQuantity("15", stock, 1)).toBe(15);
      expect(validateAndClampQuantity("100", stock, 1)).toBe(100);
      expect(validateAndClampQuantity("30", stock, 1)).toBe(30);
    });

    it("Debe reemplazar directamente una cantidad existente sin requerir incrementos individuales", () => {
      const stock = 50;
      const prevQuantity = 1;
      // Reemplazo directo con una cadena completa
      const newQuantity = validateAndClampQuantity("25", stock, prevQuantity);
      expect(newQuantity).toBe(25);
    });

    it("Debe respetar el inventario disponible y limitar al stock máximo cuando se exceda", () => {
      const stock = 10;
      // El usuario escribe 15 o 100 teniendo solo 10 en stock
      expect(validateAndClampQuantity("15", stock, 1)).toBe(10);
      expect(validateAndClampQuantity("100", stock, 1)).toBe(10);
    });

    it("Debe conservar la cantidad anterior si el valor ingresado es vacío, inválido o no numérico", () => {
      const stock = 20;
      const fallback = 3;
      expect(validateAndClampQuantity("", stock, fallback)).toBe(fallback);
      expect(validateAndClampQuantity("   ", stock, fallback)).toBe(fallback);
      expect(validateAndClampQuantity("abc", stock, fallback)).toBe(fallback);
      expect(validateAndClampQuantity("12a", stock, fallback)).toBe(fallback);
    });

    it("Debe rechazar cantidades menores o iguales a cero (evitar negativos o 0)", () => {
      const stock = 20;
      const fallback = 2;
      expect(validateAndClampQuantity("0", stock, fallback)).toBe(fallback);
      expect(validateAndClampQuantity("-5", stock, fallback)).toBe(fallback);
    });

    it("Debe actualizar correctamente el subtotal del artículo y el total de la venta tras cambiar la cantidad", () => {
      const itemBase = {
        productId: "prod-1",
        name: "Sandalia Confort",
        originalPrice: 150,
        unitCost: 80,
      };

      // Venta inicial con 1 unidad
      const cartInit = calculateCart([
        { ...itemBase, quantity: 1 },
      ]);
      expect(cartInit.total).toBe(150);
      expect(cartInit.items[0].subtotal).toBe(150);

      // Usuario ingresa cantidad 5 con teclado
      const qty5 = validateAndClampQuantity("5", 50, 1);
      const cart5 = calculateCart([
        { ...itemBase, quantity: qty5 },
      ]);
      expect(cart5.total).toBe(750);
      expect(cart5.items[0].subtotal).toBe(750);

      // Usuario ingresa cantidad multi-dígito 15 con teclado
      const qty15 = validateAndClampQuantity("15", 50, 1);
      const cart15 = calculateCart([
        { ...itemBase, quantity: qty15 },
      ]);
      expect(cart15.total).toBe(2250);
      expect(cart15.items[0].subtotal).toBe(2250);
    });
  });

  describe("2. Eliminación de artículos mediante Delete y Backspace", () => {
    it("Debe resolver acción DELETE_ITEM al presionar 'Delete' con un artículo seleccionado", () => {
      const action = resolveCartKeyboardAction({
        key: "Delete",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1", "prod-2"],
      });

      expect(action).toEqual({
        type: "DELETE_ITEM",
        productId: "prod-1",
        preventDefault: true,
      });
    });

    it("Debe resolver acción DELETE_ITEM al presionar 'Backspace' con un artículo seleccionado", () => {
      const action = resolveCartKeyboardAction({
        key: "Backspace",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-2",
        cartProductIds: ["prod-1", "prod-2"],
      });

      expect(action).toEqual({
        type: "DELETE_ITEM",
        productId: "prod-2",
        preventDefault: true,
      });
    });

    it("Al eliminar un artículo, debe recalcular el subtotal y total de la venta inmediatamente", () => {
      const items = [
        {
          productId: "prod-1",
          name: "Sandalia Confort",
          originalPrice: 150,
          unitCost: 80,
          quantity: 2, // Subtotal 300
        },
        {
          productId: "prod-2",
          name: "Pantufla Peluche",
          originalPrice: 200,
          unitCost: 100,
          quantity: 1, // Subtotal 200
        },
      ];

      const beforeDelete = calculateCart(items);
      expect(beforeDelete.total).toBe(500);

      // Se elimina prod-1
      const remainingItems = items.filter((i) => i.productId !== "prod-1");
      const afterDelete = calculateCart(remainingItems);
      expect(afterDelete.total).toBe(200);
      expect(afterDelete.items).toHaveLength(1);
      expect(afterDelete.items[0].productId).toBe("prod-2");
    });

    it("Debe seleccionar el siguiente artículo disponible tras eliminar el seleccionado", () => {
      const nextId = getNextSelectedIdAfterRemoval("prod-2", "prod-2", ["prod-1"]);
      expect(nextId).toBe("prod-1");

      const emptyId = getNextSelectedIdAfterRemoval("prod-1", "prod-1", []);
      expect(emptyId).toBeNull();
    });

    it("NO debe eliminar ningún producto cuando no hay selección válida", () => {
      const actionDeleteNoSelection = resolveCartKeyboardAction({
        key: "Delete",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: null,
        cartProductIds: ["prod-1", "prod-2"],
      });
      expect(actionDeleteNoSelection.type).toBe("IGNORE");

      const actionBackspaceNoSelection = resolveCartKeyboardAction({
        key: "Backspace",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: null,
        cartProductIds: ["prod-1", "prod-2"],
      });
      expect(actionBackspaceNoSelection.type).toBe("IGNORE");
      // Previene retroceso de página en el navegador
      expect(actionBackspaceNoSelection.preventDefault).toBe(true);
    });

    it("NO debe eliminar ningún producto cuando el carrito está vacío", () => {
      const action = resolveCartKeyboardAction({
        key: "Delete",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: [],
      });
      expect(action.type).toBe("IGNORE");
    });
  });

  describe("3. Manejo y no interferencia del teclado", () => {
    it("NO debe interceptar teclas si el usuario está escribiendo en cualquier input o campo de texto", () => {
      // Usuario escribiendo en el buscador de productos o campo de precio
      const actionBackspace = resolveCartKeyboardAction({
        key: "Backspace",
        isInputOrInteractive: true,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionBackspace).toEqual({
        type: "IGNORE",
        preventDefault: false,
      });

      const actionDelete = resolveCartKeyboardAction({
        key: "Delete",
        isInputOrInteractive: true,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionDelete).toEqual({
        type: "IGNORE",
        preventDefault: false,
      });

      const actionDigit = resolveCartKeyboardAction({
        key: "5",
        isInputOrInteractive: true,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionDigit).toEqual({
        type: "IGNORE",
        preventDefault: false,
      });
    });

    it("Cuando el usuario edita directamente el input de cantidad, Delete y Backspace conservan su función normal de edición de dígitos", () => {
      // isInputOrInteractive = true porque el foco está en el input de cantidad
      const action = resolveCartKeyboardAction({
        key: "Backspace",
        isInputOrInteractive: true,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      // No debe eliminar el producto ni prevenir el comportamiento normal de borrado de texto
      expect(action.type).toBe("IGNORE");
      expect(action.preventDefault).toBe(false);
    });

    it("Evita que Backspace provoque que el navegador regrese a la página anterior cuando no se está en un input", () => {
      const actionOutside = resolveCartKeyboardAction({
        key: "Backspace",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: null,
        cartProductIds: [],
      });
      expect(actionOutside.preventDefault).toBe(true);
    });

    it("NO debe interferir cuando algún modal (Cobro, Apertura o Movimiento) está abierto", () => {
      const actionInModal = resolveCartKeyboardAction({
        key: "Delete",
        isInputOrInteractive: false,
        isAnyModalOpen: true,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionInModal).toEqual({
        type: "IGNORE",
        preventDefault: false,
      });
    });

    it("Debe activar el ingreso del primer dígito numérico (0-9) al presionar una tecla numérica con item seleccionado", () => {
      const action = resolveCartKeyboardAction({
        key: "5",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(action).toEqual({
        type: "SET_QUANTITY_DIGIT",
        productId: "prod-1",
        digit: "5",
        preventDefault: true,
      });
    });

    it("Debe soportar incrementar con '+' y decrementar con '-'", () => {
      const actionInc = resolveCartKeyboardAction({
        key: "+",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionInc.type).toBe("INCREMENT_QUANTITY");

      const actionDec = resolveCartKeyboardAction({
        key: "-",
        isInputOrInteractive: false,
        isAnyModalOpen: false,
        selectedProductId: "prod-1",
        cartProductIds: ["prod-1"],
      });
      expect(actionDec.type).toBe("DECREMENT_QUANTITY");
    });
  });
});
