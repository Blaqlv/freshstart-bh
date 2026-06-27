-- Insurance eligibility automation (v2.2): payer mapping + PII-free verification log.

-- CreateTable
CREATE TABLE "InsurancePayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payerCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InsurancePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insurerName" TEXT NOT NULL,
    "payerCode" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "rawResponseHash" TEXT NOT NULL,
    "staffReviewed" BOOLEAN NOT NULL DEFAULT false,
    "staffReviewedAt" TIMESTAMP(3),
    "staffReviewedBy" TEXT,
    "source" TEXT NOT NULL,
    "formSubmissionId" TEXT,
    "intakeId" TEXT,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsurancePayer_isActive_idx" ON "InsurancePayer"("isActive");

-- CreateIndex
CREATE INDEX "VerificationAttempt_formSubmissionId_idx" ON "VerificationAttempt"("formSubmissionId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_intakeId_idx" ON "VerificationAttempt"("intakeId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_resultStatus_staffReviewed_idx" ON "VerificationAttempt"("resultStatus", "staffReviewed");
