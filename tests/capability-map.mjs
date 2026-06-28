// tests/capability-map.mjs
import assert from "node:assert";
import { roleCapabilities } from "../src/lib/rbac.ts";
import { deriveRolePermissions, capabilitiesFromPermissions } from "../src/lib/capability-map.ts";

for (const role of Object.keys(roleCapabilities)) {
  const granted = new Set(deriveRolePermissions(role));
  const recovered = capabilitiesFromPermissions(granted).sort();
  const expected = [...roleCapabilities[role]].sort();
  assert.deepStrictEqual(recovered, expected, `caps preserved for ${role}`);
}
console.log("capability-map regression test PASSED");
