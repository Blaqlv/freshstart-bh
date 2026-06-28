import assert from "node:assert";
import { roleKeyFromEnum, enumFromRoleKey, classifyRoleAssignment } from "../src/lib/roles.ts";

// enumFromRoleKey round-trips with roleKeyFromEnum for all 6 enum roles
const enums = ["ADMINISTRATOR", "CLINICAL_DIRECTOR", "COMPLIANCE_OFFICER", "RECEPTIONIST", "PROVIDER", "BILLING_STAFF"];
for (const e of enums) {
  assert.strictEqual(enumFromRoleKey(roleKeyFromEnum(e)), e, `round-trip ${e}`);
}
assert.strictEqual(enumFromRoleKey("super_admin"), null);
assert.strictEqual(enumFromRoleKey("intake_coordinator"), null);

// classifyRoleAssignment
assert.deepStrictEqual(
  classifyRoleAssignment("administrator", { viewerIsSuperAdmin: false }),
  { kind: "builtin", role: "ADMINISTRATOR" },
);
assert.deepStrictEqual(classifyRoleAssignment("super_admin", { viewerIsSuperAdmin: true }), { kind: "reject" });
assert.deepStrictEqual(classifyRoleAssignment("intake_coordinator", { viewerIsSuperAdmin: true }), { kind: "custom" });
assert.deepStrictEqual(classifyRoleAssignment("intake_coordinator", { viewerIsSuperAdmin: false }), { kind: "reject" });
assert.deepStrictEqual(classifyRoleAssignment("", { viewerIsSuperAdmin: true }), { kind: "custom" }); // empty -> custom; DB rejects

console.log("role-assignment test PASSED");
