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

// Missing access row for a module -> deny (fail-closed default).
out = resolveEffectivePermissions({
  grants: ["cms.edit_pages"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }],
  access: [], // no ModuleRoleAccess row at all
});
assert.deepStrictEqual([...out], [], "missing access row denies");

// Unknown permission key (not in permModule) -> deny.
out = resolveEffectivePermissions({
  grants: ["nonexistent.permission"],
  permModule,
  modules: [{ key: "cms", isEnabled: true }],
  access: [{ moduleKey: "cms", canAccess: true }],
});
assert.deepStrictEqual([...out], [], "unknown permission denies");

console.log("permissions-resolve test PASSED");
