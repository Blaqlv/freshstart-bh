import { requireSuperAdmin } from "@/lib/auth";
import { listSystemAudit } from "@/lib/system/registry";
import { auditRowsToCsv, formatAuditRow } from "@/lib/system/helpers";

export async function GET() {
  await requireSuperAdmin(); // redirects non-supers
  const logs = await listSystemAudit(5000);
  const csv = auditRowsToCsv(logs.map(formatAuditRow));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="system-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
