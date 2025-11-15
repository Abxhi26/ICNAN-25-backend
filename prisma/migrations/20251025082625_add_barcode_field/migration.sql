/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_barcode_key" ON "User"("barcode");
