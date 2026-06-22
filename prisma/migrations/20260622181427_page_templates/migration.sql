-- CreateEnum
CREATE TYPE "PageTemplate" AS ENUM ('SERVICE_DETAIL', 'GENERAL');

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "hasSidebar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template" "PageTemplate" NOT NULL DEFAULT 'GENERAL';
