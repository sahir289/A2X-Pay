-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "allow_intent" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "allow_intent" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Payin" ADD COLUMN     "method" TEXT;
