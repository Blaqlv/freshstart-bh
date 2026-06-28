// tests/roles.mjs
import assert from "node:assert";
import { roleKeyFromEnum, effectiveRoleKey, ROLE_KEYS } from "../src/lib/roles.ts";
import { Role } from "@prisma/client";

assert.strictEqual(roleKeyFromEnum("ADMINISTRATOR"), "administrator");
assert.strictEqual(roleKeyFromEnum("BILLING_STAFF"), "billing_staff");
assert.strictEqual(effectiveRoleKey({ role: "PROVIDER", customRoleKey: null }), "provider");
assert.strictEqual(effectiveRoleKey({ role: "PROVIDER", customRoleKey: "intake_coordinator" }), "intake_coordinator");
assert.ok(ROLE_KEYS.includes("super_admin"));
assert.strictEqual(ROLE_KEYS.length, 7);
for (const r of Object.values(Role)) {
  assert.ok(ROLE_KEYS.includes(roleKeyFromEnum(r)), `enum ${r} maps to a known role key`);
}
console.log("roles test PASSED");
