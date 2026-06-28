// tests/permissions-resolve.mjs
import assert from "node:assert";
import { resolveEffectivePermissions } from "../src/lib/permissions.ts";

const permModule = [
  { key: "cms.edit_pages", moduleKey: "cms" },
  { key: "medicaid_enrollment.manage", moduleKey: "medicaid_enrollment" },
];

// Baseline: everything enabled and accessible -> grants pass through.
let out = resolveEffectivePermissions({
  grants: ["cms.edit_pages", "medicaid_enrollment.manage"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }, { key: "medicaid_enrollment", isEnabled: true }],
  access: [{ moduleKey: "cms", canAccess: true }, { moduleKey: "medicaid_enrollment", canAccess: true }],
});
assert.deepStrictEqual([...out].sort(), ["cms.edit_pages", "medicaid_enrollment.manage"]);

// Disabling a module removes its permissions.
out = resolveEffectivePermissions({
  grants: ["cms.edit_pages", "medicaid_enrollment.manage"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }, { key: "medicaid_enrollment", isEnabled: false }],
  access: [{ moduleKey: "cms", canAccess: true }, { moduleKey: "medicaid_enrollment", canAccess: true }],
});
assert.deepStrictEqual([...out], ["cms.edit_pages"]);

// Revoking module access removes its permissions.
out = resolveEffectivePermissions({
  grants: ["cms.edit_pages"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }],
  access: [{ moduleKey: "cms", canAccess: false }],
});
assert.deepStrictEqual([...out], []);

console.log("permissions-resolve test PASSED");
