-- CreateTable
CREATE TABLE "VendorSettlement" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "status" "Status" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "Method" NOT NULL,
    "acc_name" TEXT,
    "acc_no" TEXT,
    "ifsc" TEXT,
    "refrence_id" TEXT,
    "rejected_reason" TEXT,
    "createdBy" TEXT,
    "vendor_code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSettlement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VendorSettlement" ADD CONSTRAINT "VendorSettlement_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
