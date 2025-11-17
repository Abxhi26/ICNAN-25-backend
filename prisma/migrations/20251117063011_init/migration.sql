-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'COORDINATOR');

-- CreateTable
CREATE TABLE "Participant" (
    "id" SERIAL NOT NULL,
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
    "amountPaid" DOUBLE PRECISION,
    "barcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'COORDINATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "venue" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_referenceNo_key" ON "Participant"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_barcode_key" ON "Participant"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffId_key" ON "Staff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Entry_participantId_idx" ON "Entry"("participantId");

-- CreateIndex
CREATE INDEX "Entry_venue_idx" ON "Entry"("venue");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
