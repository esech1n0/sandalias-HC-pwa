import "server-only";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, ScheduledExpenseFrequency, ScheduledExpenseStatus } from "@/generated/prisma/client";
import { parseExpenseDate } from "@/lib/expenses/date";
import { createExpense } from "./expenses";

export interface CreateScheduledExpenseInput {
  concept: string;
  category: string;
  amount: number;
  dueDate?: Date | string | null;
  isRecurring?: boolean;
  frequency?: ScheduledExpenseFrequency | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  notes?: string | null;
  userId?: string | null;
}

export interface UpdateScheduledExpenseInput {
  id: string;
  concept: string;
  category: string;
  amount: number;
  dueDate: Date | string;
  notes?: string | null;
}

export interface PayScheduledExpenseInput {
  scheduledExpenseId: string;
  paymentMethod: PaymentMethod;
  paymentDate?: Date | string | null;
  description?: string | null;
  userId?: string | null;
}

/**
 * Calcula la siguiente fecha respetando meses de distinta duración.
 */
function addPeriod(date: Date, frequency: ScheduledExpenseFrequency): Date {
  const next = new Date(date);
  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "MONTHLY") {
    const currentDay = date.getDate();
    next.setMonth(next.getMonth() + 1);
    // Manejar desbordamiento de fin de mes (ej. 31 de enero -> 28/29 feb)
    if (next.getDate() < currentDay) {
      next.setDate(0); // Último día del mes anterior
    }
  } else if (frequency === "ANNUAL") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export async function createScheduledExpense(input: CreateScheduledExpenseInput) {
  const concept = input.concept.trim();
  if (!concept) throw new Error("El concepto del gasto programado es obligatorio.");
  if (input.amount <= 0) throw new Error("El monto debe ser mayor a cero.");

  const isRecurring = Boolean(input.isRecurring);

  if (!isRecurring) {
    const dueDate = parseExpenseDate(input.dueDate);
    return prisma.scheduledExpense.create({
      data: {
        concept,
        category: input.category,
        amount: input.amount,
        dueDate,
        isRecurring: false,
        frequency: null,
        startDate: dueDate,
        endDate: null,
        status: "PENDING",
        notes: input.notes?.trim() || null,
        userId: input.userId,
      },
    });
  }

  // Gasto Recurrente
  const frequency = input.frequency || "MONTHLY";
  const startDate = parseExpenseDate(input.startDate);
  const parsedEndDate = input.endDate ? parseExpenseDate(input.endDate) : null;

  if (parsedEndDate && parsedEndDate < startDate) {
    throw new Error("La fecha de finalización no puede ser anterior a la fecha de inicio.");
  }

  const seriesId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Generar ocurrencias: si hay fecha fin, hasta la fecha fin. Si no, generar 12 periodos futuros.
  const occurrences: { dueDate: Date }[] = [];
  let currentDue = new Date(startDate);
  const maxOccurrences = 12; // Horizonte razonable de proyección

  while (occurrences.length < maxOccurrences) {
    if (parsedEndDate && currentDue > parsedEndDate) break;
    occurrences.push({ dueDate: new Date(currentDue) });
    currentDue = addPeriod(currentDue, frequency);
    if (!parsedEndDate && occurrences.length >= maxOccurrences) break;
  }

  return prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      occurrences.map((occ) =>
        tx.scheduledExpense.create({
          data: {
            concept,
            category: input.category,
            amount: input.amount,
            dueDate: occ.dueDate,
            isRecurring: true,
            frequency,
            startDate,
            endDate: parsedEndDate,
            status: "PENDING",
            notes: input.notes?.trim() || null,
            seriesId,
            userId: input.userId,
          },
        })
      )
    );
    return created[0];
  });
}

export async function payScheduledExpense(input: PayScheduledExpenseInput) {
  return prisma.$transaction(async (tx) => {
    const scheduled = await tx.scheduledExpense.findUnique({
      where: { id: input.scheduledExpenseId },
    });

    if (!scheduled) {
      throw new Error("Gasto programado no encontrado.");
    }
    if (scheduled.status === "PAID") {
      throw new Error("Este gasto programado ya ha sido pagado.");
    }
    if (scheduled.status === "CANCELLED") {
      throw new Error("No se puede pagar un gasto programado cancelado.");
    }

    // 1. Crear el gasto real efectivamente pagado (que descuenta de caja si es efectivo)
    const realExpense = await createExpense({
      concept: scheduled.concept,
      category: scheduled.category,
      amount: Number(scheduled.amount),
      date: input.paymentDate || new Date(),
      paymentMethod: input.paymentMethod,
      description: input.description?.trim() || scheduled.notes || `Pago de compromiso programado: ${scheduled.concept}`,
      userId: input.userId || scheduled.userId,
    });

    // 2. Actualizar el gasto programado para marcarlo como pagado y enlazarlo
    const updatedScheduled = await tx.scheduledExpense.update({
      where: { id: scheduled.id },
      data: {
        status: "PAID",
        expenseId: realExpense.id,
      },
    });

    return {
      scheduled: updatedScheduled,
      expense: realExpense,
    };
  });
}

export async function cancelScheduledExpense(id: string) {
  const existing = await prisma.scheduledExpense.findUnique({ where: { id } });
  if (!existing) throw new Error("Gasto programado no encontrado.");
  if (existing.status === "PAID") {
    throw new Error("No se puede cancelar un gasto que ya ha sido pagado.");
  }

  return prisma.scheduledExpense.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

export async function updateScheduledExpense(input: UpdateScheduledExpenseInput) {
  const existing = await prisma.scheduledExpense.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Gasto programado no encontrado.");
  if (existing.status === "PAID") {
    throw new Error("No se puede editar un gasto que ya ha sido pagado.");
  }

  const concept = input.concept.trim();
  if (!concept) throw new Error("El concepto es obligatorio.");
  if (input.amount <= 0) throw new Error("El monto debe ser mayor a cero.");

  return prisma.scheduledExpense.update({
    where: { id: input.id },
    data: {
      concept,
      category: input.category,
      amount: input.amount,
      dueDate: parseExpenseDate(input.dueDate),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function getScheduledExpenses(filter?: {
  status?: "ALL" | ScheduledExpenseStatus | "OVERDUE";
  month?: number;
  year?: number;
  limit?: number;
}) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const whereClause: Record<string, unknown> = {};

  if (filter?.status && filter.status !== "ALL") {
    if (filter.status === "OVERDUE") {
      whereClause.status = "PENDING";
      whereClause.dueDate = { lt: now };
    } else {
      whereClause.status = filter.status;
    }
  }

  if (filter?.year !== undefined && filter?.month !== undefined) {
    const start = new Date(filter.year, filter.month, 1, 0, 0, 0);
    const end = new Date(filter.year, filter.month + 1, 0, 23, 59, 59, 999);
    whereClause.dueDate = {
      ...(whereClause.dueDate as object || {}),
      gte: start,
      lte: end,
    };
  }

  return prisma.scheduledExpense.findMany({
    where: whereClause,
    include: {
      expense: { select: { id: true, date: true, paymentMethod: true } },
      user: { select: { name: true, username: true } },
    },
    orderBy: { dueDate: "asc" },
    take: filter?.limit || 100,
  });
}

/**
 * Obtiene compromisos pendientes para un periodo dado (no pagados ni cancelados).
 */
export async function getPendingScheduledExpensesForPeriod(startDate: Date, endDate: Date) {
  return prisma.scheduledExpense.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: "PENDING",
    },
    orderBy: { dueDate: "asc" },
  });
}

/**
 * Verifica gastos programados próximos a vencer (en los siguientes 3 días)
 * y emite alertas/notificaciones en el sistema si no han sido generadas.
 */
export async function checkUpcomingExpensesAlerts() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(23, 59, 59, 999);

  const upcoming = await prisma.scheduledExpense.findMany({
    where: {
      status: "PENDING",
      dueDate: {
        lte: inThreeDays,
      },
    },
    orderBy: { dueDate: "asc" },
  });

  for (const item of upcoming) {
    const isOverdue = item.dueDate < now;
    const dueFormatted = item.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    const title = isOverdue ? "Compromiso Financiero Vencido" : "Gasto Próximo a Vencer";
    const message = isOverdue
      ? `El gasto "${item.concept}" por $${Number(item.amount).toLocaleString("es-MX")} venció el ${dueFormatted}.`
      : `El gasto "${item.concept}" por $${Number(item.amount).toLocaleString("es-MX")} vence el ${dueFormatted}.`;

    // Evitar notificaciones duplicadas no leídas para el mismo concepto y fecha
    const existing = await prisma.notification.findFirst({
      where: {
        type: "EXPENSE_DUE",
        message,
        isRead: false,
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          type: "EXPENSE_DUE",
          title,
          message,
          isRead: false,
        },
      });
    }
  }

  return upcoming;
}
