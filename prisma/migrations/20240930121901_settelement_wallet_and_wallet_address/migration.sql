-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "wallet" TEXT,
ADD COLUMN     "wallet_address" TEXT;

-- AlterTable
ALTER TABLE "VendorSettlement" ADD COLUMN     "wallet" TEXT,
ADD COLUMN     "wallet_address" TEXT;
