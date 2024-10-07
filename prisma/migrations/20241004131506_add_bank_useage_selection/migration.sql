-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "bank_used_for" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Payin" ADD COLUMN     "to_bank" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "from_bank" TEXT DEFAULT '';
