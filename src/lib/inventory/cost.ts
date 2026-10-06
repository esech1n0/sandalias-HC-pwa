import { roundMoney } from "../money";

// ==============================================================================
// Lógica de Inventario y Cálculo de Costo (Promedio Ponderado)
// ==============================================================================

export interface WeightedAverageCostInput {
  currentStock: number;
  currentCost: number;
  newQuantity: number;
  newUnitCost: number;
}

/**
 * Calcula el nuevo costo unitario de adquisición utilizando el método de Promedio Ponderado.
 * 
 * Regla:
 * Si el stock actual es <= 0, el nuevo costo es directamente el costo de la nueva compra.
 * De lo contrario:
 * Nuevo Costo = ((Stock Actual * Costo Actual) + (Nueva Cantidad * Nuevo Costo Unitario)) / (Stock Actual + Nueva Cantidad)
 */
export function calculateWeightedAverageCost(input: WeightedAverageCostInput): number {
  const { currentStock, currentCost, newQuantity, newUnitCost } = input;

  if (newQuantity <= 0) {
    throw new Error("La cantidad de compra debe ser un entero positivo.");
  }

  if (newUnitCost < 0) {
    throw new Error("El costo unitario no puede ser negativo.");
  }

  if (currentStock <= 0) {
    return roundMoney(newUnitCost);
  }

  const previousTotalValue = currentStock * currentCost;
  const newPurchaseTotalValue = newQuantity * newUnitCost;
  const newTotalStock = currentStock + newQuantity;

  const weightedCost = (previousTotalValue + newPurchaseTotalValue) / newTotalStock;
  return roundMoney(weightedCost);
}

/**
 * Valida la existencia de inventario para una venta.
 * No se permite venta con existencia insuficiente (stock < cantidad).
 */
export function validateStockAvailability(currentStock: number, requestedQuantity: number): boolean {
  if (requestedQuantity <= 0) return false;
  return currentStock >= requestedQuantity;
}
