import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateCashRegister } from "@/lib/cash/register";

export async function getActiveCashRegister() {
  return prisma.cashRegister.findFirst({
    where: { status: "OPEN" },
    include: {
      movements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      openedBy: { select: { name: true, username: true } },
    },
  });
}

export async function openCashRegister(openingBalance: number, userId: string) {
  if (openingBalance < 0) {
    throw new Error("El fondo inicial no puede ser negativo.");
  }

  // Verificar si ya existe una caja abierta
  const existing = await prisma.cashRegister.findFirst({
    where: { status: "OPEN" },
  });

  if (existing) {
    throw new Error("Ya existe una caja abierta actualmente.");
  }

  return prisma.$transaction(async (tx) => {
    const register = await tx.cashRegister.create({
      data: {
        openingBalance,
        expectedCash: openingBalance,
        status: "OPEN",
        openedById: userId,
      },
    });

    await tx.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: "OPENING",
        amount: openingBalance,
        reason: "Fondo inicial de apertura de caja",
        userId,
      },
    });

    return register;
  });
}

export async function createWithdrawal(
  cashRegisterId: string,
  amount: number,
  reason: string,
  userId: string
) {
  if (amount <= 0) {
    throw new Error("El monto del retiro debe ser mayor a cero.");
  }
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error("El motivo del retiro es obligatorio.");
  }

  return prisma.$transaction(async (tx) => {
    const register = await tx.cashRegister.findUnique({
      where: { id: cashRegisterId },
    });

    if (!register || register.status !== "OPEN") {
      throw new Error("No hay una caja abierta válida para realizar retiros.");
    }

    if (amount > Number(register.expectedCash)) {
      throw new Error(
        `El monto del retiro ($${amount}) supera el efectivo disponible en caja ($${Number(register.expectedCash)}).`
      );
    }

    // 1. Registrar movimiento de Retiro (NO es gasto, solo retiro de efectivo físico)
    await tx.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: "WITHDRAWAL",
        amount,
        reason: cleanReason,
        userId,
      },
    });

    // 2. Actualizar totales de caja
    const newWithdrawalsTotal = Number(register.withdrawalsTotal) + amount;
    const newExpectedCash = Number(register.expectedCash) - amount;

    return tx.cashRegister.update({
      where: { id: register.id },
      data: {
        withdrawalsTotal: newWithdrawalsTotal,
        expectedCash: newExpectedCash,
      },
    });
  });
}

export async function closeCashRegister(
  cashRegisterId: string,
  countedCash: number,
  notes: string = "",
  userId: string
) {
  if (countedCash < 0) {
    throw new Error("El efectivo contado no puede ser negativo.");
  }

  return prisma.$transaction(async (tx) => {
    const register = await tx.cashRegister.findUnique({
      where: { id: cashRegisterId },
    });

    if (!register || register.status !== "OPEN") {
      throw new Error("La caja especificada ya está cerrada o no existe.");
    }

    const calc = calculateCashRegister({
      openingBalance: Number(register.openingBalance),
      cashSales: Number(register.cashSales),
      cardSales: Number(register.cardSales),
      transferSales: Number(register.transferSales),
      withdrawalsTotal: Number(register.withdrawalsTotal),
      expensesCashTotal: Number(register.expensesCashTotal),
      countedCash,
    });

    return tx.cashRegister.update({
      where: { id: register.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: userId,
        countedCash,
        difference: calc.difference,
        notes: notes.trim() || null,
      },
    });
  });
}

export async function getCashRegistersHistory(limit: number = 30) {
  return prisma.cashRegister.findMany({
    include: {
      openedBy: { select: { name: true, username: true } },
      closedBy: { select: { name: true, username: true } },
    },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}
