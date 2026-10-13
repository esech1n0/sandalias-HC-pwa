-- CreateEnum
CREATE TYPE "ScheduledExpenseStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduledExpenseFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'ANNUAL');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_DUE';

-- DropEnum
DROP TYPE "ExpenseCategory";

-- CreateTable
CREATE TABLE "scheduled_expenses" (
    "id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "ScheduledExpenseFrequency",
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "ScheduledExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "seriesId" TEXT,
    "expenseId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_expenses_expenseId_key" ON "scheduled_expenses"("expenseId");

-- CreateIndex
CREATE INDEX "scheduled_expenses_dueDate_idx" ON "scheduled_expenses"("dueDate");

-- CreateIndex
CREATE INDEX "scheduled_expenses_status_idx" ON "scheduled_expenses"("status");

-- CreateIndex
CREATE INDEX "scheduled_expenses_seriesId_idx" ON "scheduled_expenses"("seriesId");

-- AddForeignKey
ALTER TABLE "scheduled_expenses" ADD CONSTRAINT "scheduled_expenses_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_expenses" ADD CONSTRAINT "scheduled_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
