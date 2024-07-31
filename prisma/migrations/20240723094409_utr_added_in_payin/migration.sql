-- AlterTable
ALTER TABLE "Payin" ADD COLUMN     "utr" TEXT,
ALTER COLUMN "user_submitted_utr" DROP NOT NULL;
