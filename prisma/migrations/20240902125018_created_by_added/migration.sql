-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT;
