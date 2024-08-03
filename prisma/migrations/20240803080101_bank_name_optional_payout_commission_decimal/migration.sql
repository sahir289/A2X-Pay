/*
  Warnings:

  - Changed the type of `payout_commision` on the `Payout` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "bank_name" DROP NOT NULL,
DROP COLUMN "payout_commision",
ADD COLUMN     "payout_commision" DECIMAL(65,30) NOT NULL;
