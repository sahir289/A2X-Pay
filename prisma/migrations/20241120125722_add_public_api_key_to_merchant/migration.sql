/*
  Warnings:

  - Made the column `public_api_key` on table `Merchant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Merchant" ALTER COLUMN "public_api_key" SET NOT NULL;
