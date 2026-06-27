// tests/fhir-config.mjs
import assert from "node:assert";
import { hashPatientId, isSandbox } from "../src/lib/fhir/config.ts";

// hashPatientId is a stable sha256 hex, never the raw id.
const h = hashPatientId("patient-123");
assert.match(h, /^[0-9a-f]{64}$/, "hash must be 64-char hex");
assert.notStrictEqual(h, "patient-123", "must not return raw id");
assert.strictEqual(h, hashPatientId("patient-123"), "must be stable");

// Default mode is sandbox when EHR_MODE unset.
delete process.env.EHR_MODE;
assert.strictEqual(isSandbox(), true, "defaults to sandbox");
process.env.EHR_MODE = "production";
assert.strictEqual(isSandbox(), false, "production disables sandbox");

console.log("fhir-config test PASSED");
