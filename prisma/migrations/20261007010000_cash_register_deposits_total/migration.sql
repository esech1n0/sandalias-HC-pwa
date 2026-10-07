-- AlterTable
ALTER TABLE "cash_registers" ADD COLUMN IF NOT EXISTS "depositsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
