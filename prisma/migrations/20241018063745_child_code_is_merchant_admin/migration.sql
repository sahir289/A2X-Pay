-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "child_code" TEXT[],
ADD COLUMN     "is_merchant_Admin" BOOLEAN NOT NULL DEFAULT false;
