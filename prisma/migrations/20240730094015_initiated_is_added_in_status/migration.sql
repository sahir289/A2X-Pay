/*
  Warnings:

  - You are about to alter the column `expirationDate` on the `Payin` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'INITIATED';

-- AlterTable
ALTER TABLE "Payin" ALTER COLUMN "expirationDate" SET DATA TYPE INTEGER;
