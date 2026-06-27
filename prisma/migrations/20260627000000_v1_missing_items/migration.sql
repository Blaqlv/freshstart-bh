-- v1 missing items: review moderation (A9), GBP/hours on Location (A3/A4),
-- SMS consent on Patient + IntakeSubmission (A5/E6/E7), public form submission
-- audit log (A2), and slot-ready appointment schema (A6).

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: Testimonial moderation pipeline (A9)
ALTER TABLE "Testimonial"
  ADD COLUMN "moderation" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "originalQuote" TEXT,
  ADD COLUMN "moderatedById" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3),
  ADD COLUMN "ipHash" TEXT;

-- Preserve currently-live (seeded) reviews so they stay visible after the cutover.
UPDATE "Testimonial" SET "moderation" = 'APPROVED' WHERE "status" = 'PUBLISHED';

CREATE INDEX "Testimonial_moderation_idx" ON "Testimonial"("moderation");

-- AlterTable: Location GBP id + opening hours (A3/A4)
ALTER TABLE "Location"
  ADD COLUMN "gbpPlaceId" TEXT,
  ADD COLUMN "hours" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: Patient SMS consent + communication preferences (A5/E6/E7)
ALTER TABLE "Patient"
  ADD COLUMN "smsConsentGiven" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsConsentAt" TIMESTAMP(3),
  ADD COLUMN "smsConsentIpHash" TEXT,
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "smsAppointmentReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "smsPortalAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailAppointmentReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "emailPortalAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastPortalSmsAt" TIMESTAMP(3);

-- AlterTable: IntakeSubmission SMS consent (A5)
ALTER TABLE "IntakeSubmission"
  ADD COLUMN "smsConsentGiven" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsConsentAt" TIMESTAMP(3),
  ADD COLUMN "smsConsentIpHash" TEXT,
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "preferredLanguage" TEXT NOT NULL DEFAULT 'en';

-- CreateTable: PublicFormSubmission (A2)
CREATE TABLE "PublicFormSubmission" (
  "id" TEXT NOT NULL,
  "formType" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "sessionId" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "staffNotes" TEXT,
  "createdBy" TEXT,
  CONSTRAINT "PublicFormSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PublicFormSubmission_formType_status_idx" ON "PublicFormSubmission"("formType", "status");
CREATE INDEX "PublicFormSubmission_submittedAt_idx" ON "PublicFormSubmission"("submittedAt");

-- CreateTable: AppointmentSlot (A6)
CREATE TABLE "AppointmentSlot" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "bookedBy" TEXT,
  CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppointmentSlot_providerId_idx" ON "AppointmentSlot"("providerId");
CREATE INDEX "AppointmentSlot_locationId_idx" ON "AppointmentSlot"("locationId");
CREATE INDEX "AppointmentSlot_startTime_idx" ON "AppointmentSlot"("startTime");

-- CreateTable: AppointmentRequest (A6)
CREATE TABLE "AppointmentRequest" (
  "id" TEXT NOT NULL,
  "patientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "preferredContact" TEXT NOT NULL,
  "smsConsent" BOOLEAN NOT NULL DEFAULT false,
  "smsConsentAt" TIMESTAMP(3),
  "smsConsentIpHash" TEXT,
  "slotId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AppointmentRequest_status_idx" ON "AppointmentRequest"("status");
CREATE INDEX "AppointmentRequest_submittedAt_idx" ON "AppointmentRequest"("submittedAt");

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AppointmentSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
