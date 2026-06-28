// tests/seed-data.mjs
import assert from "node:assert";
import { MODULES } from "../prisma/seeds/modules.ts";
import { ROLES } from "../prisma/seeds/roles.ts";
import { PERMISSIONS } from "../prisma/seeds/permissions.ts";
import { CAPABILITY_PERMISSIONS } from "../src/lib/capability-map.ts";
import { ROLE_KEYS } from "../src/lib/roles.ts";

const moduleKeys = new Set(MODULES.map((m) => m.key));
const permKeys = new Set(PERMISSIONS.map((p) => p.key));

assert.strictEqual(MODULES.length, 26, "26 modules");
assert.strictEqual(moduleKeys.size, 26, "module keys unique");
assert.strictEqual(ROLES.length, 7, "7 roles");
assert.strictEqual(new Set(ROLES.map((r) => r.key)).size, 7, "role keys unique");
assert.strictEqual(permKeys.size, PERMISSIONS.length, "permission keys unique");
assert.strictEqual(PERMISSIONS.length, 44, "44 permissions");
assert.deepStrictEqual([...ROLE_KEYS].sort(), ROLES.map((r) => r.key).sort(), "ROLE_KEYS matches seed roles");

for (const k of ["cms", "public_site", "audit_log", "user_management", "cookie_consent", "system_control"]) {
  assert.strictEqual(MODULES.find((m) => m.key === k)?.canDisable, false, `${k} canDisable=false`);
}
for (const p of PERMISSIONS) assert.ok(moduleKeys.has(p.moduleKey), `module ${p.moduleKey} exists for ${p.key}`);
for (const caps of Object.values(CAPABILITY_PERMISSIONS))
  for (const pk of caps) assert.ok(permKeys.has(pk), `mapped permission ${pk} in catalog`);

console.log("seed-data test PASSED");
