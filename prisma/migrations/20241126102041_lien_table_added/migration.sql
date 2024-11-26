-- CreateTable
CREATE TABLE "Lien" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "merchant_order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sno" SERIAL NOT NULL,

    CONSTRAINT "Lien_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lien" ADD CONSTRAINT "Lien_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
