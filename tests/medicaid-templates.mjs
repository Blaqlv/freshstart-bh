// tests/medicaid-templates.mjs
import assert from "node:assert";
import {
  initialEnrollmentChecklist,
  revalidationChecklist,
  checklistFor,
} from "../src/lib/medicaid/checklist-templates.ts";

assert.strictEqual(initialEnrollmentChecklist.length, 14, "initial has 14 steps");
assert.strictEqual(revalidationChecklist.length, 7, "revalidation has 7 steps");
// step numbers 1..N, unique, ordered
for (const list of [initialEnrollmentChecklist, revalidationChecklist]) {
  list.forEach((it, i) => assert.strictEqual(it.stepNumber, i + 1, "sequential stepNumber"));
  list.forEach((it) => assert.ok(it.title && it.description, "title+description present"));
}
assert.strictEqual(checklistFor("initial_enrollment").length, 14);
assert.strictEqual(checklistFor("revalidation").length, 7);
assert.strictEqual(checklistFor("change_of_ownership").length, 0, "no template for change_of_ownership");
console.log("medicaid-templates test PASSED");
