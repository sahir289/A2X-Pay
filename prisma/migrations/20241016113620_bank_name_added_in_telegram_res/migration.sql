/*
  Warnings:

  - You are about to drop the column `incomingBankId` on the `TelegramResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TelegramResponse" DROP COLUMN "incomingBankId",
ADD COLUMN     "bankName" TEXT;
