-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "fhirLinkStatus" TEXT,
ADD COLUMN     "fhirLinkedAt" TIMESTAMP(3),
ADD COLUMN     "fhirPatientId" TEXT;

-- AlterTable
ALTER TABLE "RefillRequest" ADD COLUMN     "sourceFhirMedication" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_fhirPatientId_key" ON "Patient"("fhirPatientId");
