-- CreateTable
CREATE TABLE "Paper" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paperId" TEXT NOT NULL,
    "created" TEXT,
    "lastModified" TEXT,
    "paperTitle" TEXT NOT NULL,
    "abstract" TEXT,
    "primaryContactAuthorName" TEXT NOT NULL,
    "primaryContactAuthorEmail" TEXT NOT NULL,
    "authors" TEXT,
    "authorNames" TEXT,
    "authorEmails" TEXT,
    "trackName" TEXT,
    "primarySubjectArea" TEXT,
    "secondarySubjectAreas" TEXT,
    "status" TEXT,
    "files" TEXT,
    "numberOfFiles" INTEGER DEFAULT 0,
    "supplementaryFiles" TEXT,
    "numberOfSupplementaryFiles" INTEGER DEFAULT 0,
    "reviewers" TEXT,
    "reviewerEmails" TEXT,
    "metaReviewers" TEXT,
    "metaReviewerEmails" TEXT,
    "seniorMetaReviewers" TEXT,
    "seniorMetaReviewerEmails" TEXT,
    "conflicts" INTEGER DEFAULT 0,
    "assigned" INTEGER DEFAULT 0,
    "completed" INTEGER DEFAULT 0,
    "percentCompleted" INTEGER DEFAULT 0,
    "bids" INTEGER DEFAULT 0,
    "discussion" TEXT,
    "requestedForAuthorFeedback" TEXT,
    "authorFeedbackSubmitted" TEXT,
    "requestedForCameraReady" TEXT,
    "cameraReadySubmitted" TEXT,
    "requestedForPresentation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Paper_paperId_key" ON "Paper"("paperId");

-- CreateIndex
CREATE INDEX "Paper_paperId_idx" ON "Paper"("paperId");

-- CreateIndex
CREATE INDEX "Paper_primaryContactAuthorEmail_idx" ON "Paper"("primaryContactAuthorEmail");

-- CreateIndex
CREATE INDEX "Paper_trackName_idx" ON "Paper"("trackName");

-- CreateIndex
CREATE INDEX "Paper_status_idx" ON "Paper"("status");
