-- AlterTable
ALTER TABLE "Merchant" ALTER COLUMN "notify_url" DROP NOT NULL,
ALTER COLUMN "payout_notify_url" DROP NOT NULL,
ALTER COLUMN "balance" DROP NOT NULL;
