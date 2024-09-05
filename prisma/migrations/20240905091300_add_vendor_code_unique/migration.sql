/*
  Warnings:

  - A unique constraint covering the columns `[vendor_code]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendor_code_key" ON "Vendor"("vendor_code");
