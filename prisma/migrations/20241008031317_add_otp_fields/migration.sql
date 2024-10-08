-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);
