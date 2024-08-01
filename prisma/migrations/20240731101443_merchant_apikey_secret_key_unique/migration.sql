/*
  Warnings:

  - A unique constraint covering the columns `[api_key]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[secret_key]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Merchant_api_key_key" ON "Merchant"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_secret_key_key" ON "Merchant"("secret_key");
