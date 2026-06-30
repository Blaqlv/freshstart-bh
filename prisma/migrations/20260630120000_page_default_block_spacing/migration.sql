-- Default wrapper spacing pre-applied to NEW blocks added to a page (opt-in).
-- Part of the block-spacing + image-only feature. Nullable: no-op until set.

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "defaultBlockSpacing" TEXT;
