-- Service CMS management fields + RelatedService join model.
-- Adds new columns to Service, creates RelatedService, wires Page <-> Service FK.

-- AlterTable: add CMS-management fields and page FK to Service
ALTER TABLE "Service" ADD COLUMN "excerpt" TEXT NOT NULL DEFAULT '',
                       ADD COLUMN "metaDescription" TEXT,
                       ADD COLUMN "iconName" TEXT,
                       ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
                       ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
                       ADD COLUMN "pageId" TEXT;

-- CreateIndex: unique constraint on Service.pageId (one Service per Page)
CREATE UNIQUE INDEX "Service_pageId_key" ON "Service"("pageId");

-- CreateIndex: composite index for active-services sorted listing
CREATE INDEX "Service_isActive_sortOrder_idx" ON "Service"("isActive", "sortOrder");

-- CreateTable: RelatedService join model
CREATE TABLE "RelatedService" (
    "id" TEXT NOT NULL,
    "primaryId" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RelatedService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: prevent duplicate (primary, related) pairs
CREATE UNIQUE INDEX "RelatedService_primaryId_relatedId_key" ON "RelatedService"("primaryId", "relatedId");

-- AddForeignKey: Service.pageId -> Page.id
ALTER TABLE "Service" ADD CONSTRAINT "Service_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: RelatedService.primaryId -> Service.id
ALTER TABLE "RelatedService" ADD CONSTRAINT "RelatedService_primaryId_fkey" FOREIGN KEY ("primaryId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RelatedService.relatedId -> Service.id
ALTER TABLE "RelatedService" ADD CONSTRAINT "RelatedService_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
