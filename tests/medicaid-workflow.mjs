// tests/medicaid-workflow.mjs
import assert from "node:assert";
import {
  isValidTransition,
  completionPercent,
  CASE_STATUSES,
  MCO_STATUSES,
} from "../src/lib/medicaid/constants.ts";

// Allowed transitions
assert.strictEqual(isValidTransition("not_started", "in_progress"), true);
assert.strictEqual(isValidTransition("in_progress", "submitted"), true);
assert.strictEqual(isValidTransition("submitted", "approved"), true);
assert.strictEqual(isValidTransition("submitted", "rejected"), true);
assert.strictEqual(isValidTransition("submitted", "pending_info"), true);
assert.strictEqual(isValidTransition("pending_info", "submitted"), true);
// Disallowed
assert.strictEqual(isValidTransition("not_started", "approved"), false);
assert.strictEqual(isValidTransition("approved", "in_progress"), false);
assert.strictEqual(isValidTransition("in_progress", "in_progress"), false);

// completionPercent
assert.strictEqual(completionPercent([]), 0);
assert.strictEqual(completionPercent([{ isComplete: true }, { isComplete: false }]), 50);
assert.strictEqual(completionPercent([{ isComplete: true }, { isComplete: true }]), 100);

assert.ok(CASE_STATUSES.includes("pending_info"));
assert.ok(MCO_STATUSES.includes("submitted"));
console.log("medicaid-workflow test PASSED");
