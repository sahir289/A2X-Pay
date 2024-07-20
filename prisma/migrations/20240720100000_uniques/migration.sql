/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Merchant_code_key" ON "Merchant"("code");
