// tests/eligibility-sandbox.mjs
import assert from "node:assert";
process.env.ELIGIBILITY_MODE = "sandbox";
const { checkEligibility } = await import("../src/lib/eligibility/adapter.ts");

const base = { patientFirstName: "A", patientLastName: "B", patientDob: "1990-01-01", insurancePayerCode: "AETNA" };

const active = await checkEligibility({ ...base, memberId: "123" }); // odd → active
assert.strictEqual(active.status, "active");
assert.match(active.rawResponseHash, /^[0-9a-f]{64}$/);
assert.ok(!("memberId" in active) && !("patientDob" in active), "result has no PII");

const inactive = await checkEligibility({ ...base, memberId: "124" }); // even → inactive
assert.strictEqual(inactive.status, "inactive");

const errored = await checkEligibility({ ...base, memberId: "X0000Y" }); // error → unknown
assert.strictEqual(errored.status, "unknown");

const blank = await checkEligibility({ ...base, memberId: "" }); // unknown
assert.strictEqual(blank.status, "unknown");
console.log("eligibility-sandbox test PASSED");
