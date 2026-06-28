-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicaidEnrollmentCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerNpi" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "assignedTo" TEXT,
    "targetDeadline" TIMESTAMP(3),
    "ohioMedicaidId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicaidEnrollmentCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "EnrollmentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "reviewNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "EnrollmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McoEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "mcoName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "McoEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentAuditEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "EnrollmentAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "MedicaidEnrollmentCase_tenantId_status_idx" ON "MedicaidEnrollmentCase"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EnrollmentChecklistItem_tenantId_caseId_idx" ON "EnrollmentChecklistItem"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "EnrollmentDocument_tenantId_caseId_idx" ON "EnrollmentDocument"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "McoEnrollment_tenantId_caseId_idx" ON "McoEnrollment"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "EnrollmentAuditEntry_tenantId_caseId_idx" ON "EnrollmentAuditEntry"("tenantId", "caseId");

-- AddForeignKey
ALTER TABLE "EnrollmentChecklistItem" ADD CONSTRAINT "EnrollmentChecklistItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MedicaidEnrollmentCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentDocument" ADD CONSTRAINT "EnrollmentDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MedicaidEnrollmentCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McoEnrollment" ADD CONSTRAINT "McoEnrollment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MedicaidEnrollmentCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentAuditEntry" ADD CONSTRAINT "EnrollmentAuditEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MedicaidEnrollmentCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
