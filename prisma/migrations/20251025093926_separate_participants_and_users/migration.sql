/*
  Warnings:

  - You are about to drop the column `userId` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `amountPaid` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `designation` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `instituteAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mobileNo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `paperId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `prefix` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referenceNo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `registeredCategory` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `registrationDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `User` table. All the data in the column will be lost.
  - Added the required column `participantId` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Participant" (
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
    "barcode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "participantId" INTEGER NOT NULL,
    "venue" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffEmail" TEXT NOT NULL,
    CONSTRAINT "Entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Entry" ("id", "staffEmail", "timestamp", "venue") SELECT "id", "staffEmail", "timestamp", "venue" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE INDEX "Entry_participantId_idx" ON "Entry"("participantId");
CREATE INDEX "Entry_venue_idx" ON "Entry"("venue");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role") SELECT "createdAt", "email", "id", "name", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_referenceNo_key" ON "Participant"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_barcode_key" ON "Participant"("barcode");
