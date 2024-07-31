/*
  Warnings:

  - The primary key for the `Settlement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Settlement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "refrence_id" DROP NOT NULL,
ADD CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id");
