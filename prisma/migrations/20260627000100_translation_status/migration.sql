-- Spanish translation workflow status per CMS page (D3).

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'NEEDS_REVIEW', 'APPROVED');

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_STARTED';
