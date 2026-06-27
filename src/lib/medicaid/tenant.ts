// src/lib/medicaid/tenant.ts
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { FRESH_START_TENANT_SLUG } from "@/lib/constants";

/**
 * Resolve the active tenant id. Today there is exactly one tenant (Fresh Start);
 * every enrollment query filters by this id so adding tenants in v4.0 is a
 * configuration change, not a data-model change. `cache` dedupes within a request.
 */
export const getActiveTenantId = cache(async (): Promise<string> => {
  const tenant = await db.tenant.findUnique({ where: { slug: FRESH_START_TENANT_SLUG } });
  if (!tenant) {
    throw new Error(
      `Active tenant "${FRESH_START_TENANT_SLUG}" not found. Run \`npm run db:seed\` to create it.`,
    );
  }
  return tenant.id;
});
