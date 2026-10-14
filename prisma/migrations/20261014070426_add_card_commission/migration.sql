-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionRate" DECIMAL(5,2),
ADD COLUMN     "netAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cardCommissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cardCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "netReceivedAmount" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "cardCommissionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cardCommissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0;
