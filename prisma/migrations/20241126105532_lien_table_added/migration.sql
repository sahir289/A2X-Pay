/*
  Warnings:

  - Added the required column `when` to the `Lien` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lien" ADD COLUMN     "when" TIMESTAMP(3) NOT NULL;
