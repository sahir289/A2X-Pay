-- AlterTable
ALTER TABLE "User" ADD COLUMN     "code" TEXT,
ALTER COLUMN "isEnabled" SET DEFAULT true;

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "parent_id" INTEGER,
    "payin_theme" TEXT,
    "notes" TEXT,
    "site_url" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "notify_url" TEXT NOT NULL,
    "return_url" TEXT NOT NULL,
    "min_payin" TEXT NOT NULL,
    "max_payin" TEXT NOT NULL,
    "payin_commission" DECIMAL(65,30) NOT NULL,
    "min_payout" TEXT NOT NULL,
    "max_payout" TEXT NOT NULL,
    "payout_commission" DECIMAL(65,30) NOT NULL,
    "payout_notify_url" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "is_test_mode" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
