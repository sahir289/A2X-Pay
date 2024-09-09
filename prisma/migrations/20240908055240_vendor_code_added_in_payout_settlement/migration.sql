-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "vendor_code" TEXT;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "vendor_code" TEXT;
