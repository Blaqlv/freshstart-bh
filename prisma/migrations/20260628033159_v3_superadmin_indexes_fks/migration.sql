-- AlterTable
ALTER TABLE "SystemModule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ModuleRoleAccess_roleKey_idx" ON "ModuleRoleAccess"("roleKey");

-- CreateIndex
CREATE INDEX "Permission_moduleKey_idx" ON "Permission"("moduleKey");

-- CreateIndex
CREATE INDEX "RolePermission_permissionKey_idx" ON "RolePermission"("permissionKey");

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_moduleKey_fkey" FOREIGN KEY ("moduleKey") REFERENCES "SystemModule"("key") ON DELETE CASCADE ON UPDATE CASCADE;
