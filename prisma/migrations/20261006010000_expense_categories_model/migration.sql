-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "category" TYPE TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");
