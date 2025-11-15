/*
  Warnings:

  - You are about to drop the column `barcode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `regNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `vitian` on the `User` table. All the data in the column will be lost.
  - Added the required column `referenceNo` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referenceNo" TEXT NOT NULL,
    "prefix" TEXT,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "designation" TEXT,
    "institution" TEXT,
    "instituteAddress" TEXT,
    "state" TEXT,
    "country" TEXT,
    "email" TEXT NOT NULL,
    "mobileNo" TEXT,
    "registeredCategory" TEXT,
    "paperId" TEXT,
    "registrationDate" TEXT,
    "transactionId" TEXT,
    "invoiceNo" TEXT,
    "amountPaid" REAL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role") SELECT "createdAt", "email", "id", "name", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_referenceNo_key" ON "User"("referenceNo");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
