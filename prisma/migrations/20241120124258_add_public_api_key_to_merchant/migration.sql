/*
  Warnings:

  - A unique constraint covering the columns `[public_api_key]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "public_api_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_public_api_key_key" ON "Merchant"("public_api_key");
