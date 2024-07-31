/*
  Warnings:

  - A unique constraint covering the columns `[amount_code]` on the table `TelegramResponse` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TelegramResponse_amount_code_key" ON "TelegramResponse"("amount_code");
