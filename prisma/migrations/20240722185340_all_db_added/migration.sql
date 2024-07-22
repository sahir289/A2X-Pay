/*
  Warnings:

  - Changed the type of `balance` on the `Merchant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ASSIGNED', 'SUCCESS', 'DROPPED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR');

-- CreateEnum
CREATE TYPE "Method" AS ENUM ('BANK', 'CASH', 'AED', 'CRYPTO');

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "balance",
ADD COLUMN     "balance" DECIMAL(65,30) NOT NULL;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "upi_id" TEXT NOT NULL,
    "upi_params" TEXT,
    "name" TEXT NOT NULL,
    "ac_no" TEXT NOT NULL,
    "ac_name" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "is_qr" BOOLEAN NOT NULL DEFAULT true,
    "is_bank" BOOLEAN NOT NULL DEFAULT true,
    "min_payin" DECIMAL(65,30) NOT NULL,
    "max_payin" DECIMAL(65,30) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "payin_count" INTEGER NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant_Bank" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,

    CONSTRAINT "Merchant_Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payin" (
    "id" TEXT NOT NULL,
    "upi_short_code" TEXT NOT NULL,
    "qr_params" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "Status" NOT NULL,
    "is_notified" BOOLEAN NOT NULL DEFAULT false,
    "user_submitted_utr" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "merchant_order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bank_acc_id" TEXT NOT NULL,
    "payin_commission" DECIMAL(65,30) NOT NULL,
    "return_url" TEXT NOT NULL,
    "notify_url" TEXT NOT NULL,
    "user_submitted_image" TEXT,
    "approved_at" TIMESTAMP(3),
    "merchant_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "Status" NOT NULL,
    "failed_reason" TEXT,
    "currency" "Currency" NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "banck_account_id" TEXT NOT NULL,
    "merchant_order_id" TEXT NOT NULL,
    "acc_no" TEXT NOT NULL,
    "acc_holder_name" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "upi_id" TEXT NOT NULL,
    "utr_id" TEXT NOT NULL,
    "payout_commision" TEXT NOT NULL,
    "notify_url" TEXT,
    "rejected_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "Method" NOT NULL,
    "acc_name" TEXT,
    "acc_no" TEXT,
    "ifsc" TEXT,
    "refrence_id" TEXT NOT NULL,
    "rejected_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_Bank_merchantId_bankAccountId_key" ON "Merchant_Bank"("merchantId", "bankAccountId");

-- AddForeignKey
ALTER TABLE "Merchant_Bank" ADD CONSTRAINT "Merchant_Bank_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant_Bank" ADD CONSTRAINT "Merchant_Bank_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payin" ADD CONSTRAINT "Payin_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
