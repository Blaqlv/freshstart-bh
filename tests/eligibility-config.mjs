// tests/eligibility-config.mjs
import assert from "node:assert";
import { isSandbox, hashResponse } from "../src/lib/eligibility/config.ts";

delete process.env.ELIGIBILITY_MODE;
assert.strictEqual(isSandbox(), true, "defaults to sandbox");
process.env.ELIGIBILITY_MODE = "production";
assert.strictEqual(isSandbox(), false);

const h = hashResponse('{"x":1}');
assert.match(h, /^[0-9a-f]{64}$/, "sha256 hex");
assert.strictEqual(h, hashResponse('{"x":1}'), "stable");
console.log("eligibility-config test PASSED");
