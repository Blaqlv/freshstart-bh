-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "IntakeSubmission" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "dataEncrypted" TEXT NOT NULL,
    "resumeTokenHash" TEXT NOT NULL,
    "signedName" TEXT,
    "signedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeSubmission_email_idx" ON "IntakeSubmission"("email");

-- CreateIndex
CREATE INDEX "IntakeSubmission_status_idx" ON "IntakeSubmission"("status");
