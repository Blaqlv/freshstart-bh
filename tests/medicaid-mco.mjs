// tests/medicaid-mco.mjs
import assert from "node:assert";
import { MCO_NAMES } from "../src/lib/medicaid/mco.ts";
assert.strictEqual(MCO_NAMES.length, 7, "7 MCOs");
for (const n of ["Buckeye", "CareSource", "Paramount", "Molina", "Anthem", "AmeriHealth", "Aetna Better Health"])
  assert.ok(MCO_NAMES.includes(n), `${n} present`);
console.log("medicaid-mco test PASSED");
