-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'DISPUTE';

-- AlterTable
ALTER TABLE "Payin" ADD COLUMN     "confirmed" DECIMAL(65,30),
ADD COLUMN     "sno" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "sno" SERIAL NOT NULL;
