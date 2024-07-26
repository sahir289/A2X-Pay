-- CreateTable
CREATE TABLE "TelegramResponse" (
    "id" TEXT NOT NULL,
    "status" TEXT,
    "amount" DECIMAL(65,30),
    "amount_code" TEXT,
    "utr" TEXT,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramResponse_pkey" PRIMARY KEY ("id")
);
