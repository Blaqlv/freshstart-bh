// tests/system-helpers.mjs
import assert from "node:assert";
import {
  slugifyRoleKey, isBuiltInRoleKey, groupModulesByGroup,
  groupPermissionsByModule, additivePermissionDiff, auditRowsToCsv, GROUP_ORDER,
} from "../src/lib/system/helpers.ts";
import { formatAuditRow } from "../src/lib/system/helpers.ts";

// slugify
assert.strictEqual(slugifyRoleKey("Intake Coordinator"), "intake_coordinator");
assert.strictEqual(slugifyRoleKey("  Front-Desk / Reception!! "), "front_desk_reception");
assert.strictEqual(slugifyRoleKey(slugifyRoleKey("Intake Coordinator")), "intake_coordinator"); // idempotent

// built-in guard
assert.strictEqual(isBuiltInRoleKey("administrator"), true);
assert.strictEqual(isBuiltInRoleKey("super_admin"), true);
assert.strictEqual(isBuiltInRoleKey("intake_coordinator"), false);

// group-bys
const mods = [{ key: "a", group: "admin" }, { key: "b", group: "portals" }, { key: "c", group: "admin" }];
const g = groupModulesByGroup(mods);
assert.deepStrictEqual(g.admin.map((m) => m.key), ["a", "c"]);
assert.deepStrictEqual(g.portals.map((m) => m.key), ["b"]);

const perms = [{ key: "x.a", moduleKey: "x" }, { key: "y.a", moduleKey: "y" }, { key: "x.b", moduleKey: "x" }];
const gp = groupPermissionsByModule(perms);
assert.deepStrictEqual(gp.x.map((p) => p.key), ["x.a", "x.b"]);

// additive diff
assert.deepStrictEqual(additivePermissionDiff(["a", "b"], ["b", "c", "d"]), ["c", "d"]);
assert.deepStrictEqual(additivePermissionDiff(["a", "b", "c"], ["a", "b"]), []);

// csv escaping + header
const csv = auditRowsToCsv([
  { createdAt: "2026-06-28T10:00:00.000Z", action: "system.module.disable", target: "patient_portal", actorEmail: "sa@x.com", prev: "true", next: "false" },
  { createdAt: "2026-06-28T10:01:00.000Z", action: "system.role.create", target: 'Role, "X"', actorEmail: null, prev: "", next: "created" },
]);
const lines = csv.split("\n");
assert.strictEqual(lines[0], "Timestamp,Action,Target,Changed By,Previous,New");
assert.ok(lines[1].includes("system.module.disable"));
assert.ok(lines[2].includes('"Role, ""X"""'), "escapes commas+quotes");
assert.ok(lines[2].includes("system"), "null actor -> system");

// GROUP_ORDER covers the five canonical groups
assert.deepStrictEqual([...GROUP_ORDER], ["public_site", "portals", "admin", "compliance", "integrations"]);

const row = formatAuditRow({ createdAt: "2026-06-28T10:00:00.000Z", action: "system.module.disable", entityId: "patient_portal", actorEmail: "sa@x.com", metadata: { target: "Patient Portal", prev: true, next: false } });
assert.strictEqual(row.target, "Patient Portal");
assert.strictEqual(row.prev, "true");
assert.strictEqual(row.next, "false");
const row2 = formatAuditRow({ createdAt: "2026-06-28T10:00:00.000Z", action: "system.role.create", entityId: "intake_coordinator", actorEmail: null, metadata: { next: "created" } });
assert.strictEqual(row2.target, "intake_coordinator");
assert.strictEqual(row2.actorEmail, null);

console.log("system-helpers test PASSED");
