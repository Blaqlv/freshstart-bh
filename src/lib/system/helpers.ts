import { ROLE_KEYS } from "@/lib/roles";

export const GROUP_ORDER = ["public_site", "portals", "admin", "compliance", "integrations"] as const;
export const GROUP_LABELS: Record<string, string> = {
  public_site: "Public Site",
  portals: "Portals",
  admin: "Admin",
  compliance: "Compliance",
  integrations: "Integrations",
};

/** Slugify a human label into a machine role key: lowercase, non-alnum -> "_", trimmed. */
export function slugifyRoleKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** The 7 enum-backed roles are protected (cannot be deactivated/renamed-key). */
export function isBuiltInRoleKey(key: string): boolean {
  return (ROLE_KEYS as readonly string[]).includes(key);
}

export function groupModulesByGroup<T extends { group: string }>(modules: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const m of modules) (out[m.group] ??= []).push(m);
  return out;
}

export function groupPermissionsByModule<T extends { moduleKey: string }>(perms: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const p of perms) (out[p.moduleKey] ??= []).push(p);
  return out;
}

/** Permissions in `source` not already in `target`, order-preserved, de-duped. */
export function additivePermissionDiff(targetGrants: string[], sourceGrants: string[]): string[] {
  const have = new Set(targetGrants);
  const out: string[] = [];
  for (const k of sourceGrants) {
    if (!have.has(k) && !out.includes(k)) out.push(k);
  }
  return out;
}

export type AuditCsvRow = {
  createdAt: Date | string;
  action: string;
  target: string;
  actorEmail: string | null;
  prev: string;
  next: string;
};

export function auditRowsToCsv(rows: AuditCsvRow[]): string {
  const header = ["Timestamp", "Action", "Target", "Changed By", "Previous", "New"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    const ts = typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString();
    lines.push([ts, r.action, r.target, r.actorEmail ?? "system", r.prev, r.next].map(esc).join(","));
  }
  return lines.join("\n");
}

type RawAudit = { createdAt: Date | string; action: string; entityId: string | null; actorEmail: string | null; metadata: unknown };

/** Flatten an AuditLog row into display fields for the system audit table/CSV. */
export function formatAuditRow(r: RawAudit): AuditCsvRow {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  const target = (m.target as string) ?? (m.roleKey as string) ?? (m.moduleKey as string) ?? r.entityId ?? "";
  const fmt = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return {
    createdAt: r.createdAt,
    action: r.action,
    target,
    actorEmail: r.actorEmail,
    prev: fmt(m.prev),
    next: fmt(m.next),
  };
}
