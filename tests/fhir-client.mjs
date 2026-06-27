// tests/fhir-client.mjs
import assert from "node:assert";
import { fhirGet } from "../src/lib/fhir/client.ts";

const auditCalls = [];
const auditImpl = (action, entity, meta) => auditCalls.push({ action, entity, meta });

// Success path: returns parsed JSON, writes one audit row with hashed id, no body.
const okFetch = async () =>
  new Response(JSON.stringify({ resourceType: "Bundle", entry: [] }), {
    status: 200,
    headers: { "content-type": "application/fhir+json" },
  });
const body = await fhirGet("/Appointment?patient=p1", "tok", {
  fetchImpl: okFetch,
  auditImpl,
  patientFhirId: "p1",
  resourceType: "Appointment",
});
assert.strictEqual(body.resourceType, "Bundle");
assert.strictEqual(auditCalls.length, 1, "exactly one audit row");
assert.strictEqual(auditCalls[0].entity, "Appointment");
assert.match(auditCalls[0].meta.patientIdHash, /^[0-9a-f]{64}$/);
assert.strictEqual(auditCalls[0].meta.status, 200);
assert.ok(!("body" in auditCalls[0].meta), "audit must never include the response body");

// Error path: 404 throws FhirError carrying the OperationOutcome. We assert on
// name + shape rather than `instanceof` so the test is robust to tsx loading the
// module under a different module system (CJS vs ESM) than the test itself.
const errFetch = async () =>
  new Response(JSON.stringify({ resourceType: "OperationOutcome", issue: [{ code: "not-found" }] }), {
    status: 404,
  });
await assert.rejects(
  () =>
    fhirGet("/Appointment", "tok", {
      fetchImpl: errFetch,
      auditImpl,
      patientFhirId: "p1",
      resourceType: "Appointment",
    }),
  (e) =>
    e.name === "FhirError" &&
    e.status === 404 &&
    e.outcome?.issue?.[0]?.code === "not-found",
);
assert.strictEqual(auditCalls.length, 2, "error path still audits the attempt");

console.log("fhir-client test PASSED");
