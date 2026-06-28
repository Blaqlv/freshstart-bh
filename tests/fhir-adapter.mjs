// tests/fhir-adapter.mjs
import assert from "node:assert";
process.env.EHR_MODE = "sandbox";
const { getAppointments, getMedications, getNotes, getNoteContent } = await import(
  "../src/lib/fhir/adapter.ts"
);

const appts = await getAppointments("sandbox-patient-001");
assert.ok(Array.isArray(appts) && appts.length >= 1, "sandbox returns appointments");
assert.ok(appts[0].providerName && appts[0].start, "appointment is normalized");

const meds = await getMedications("sandbox-patient-001");
assert.strictEqual(meds[0].name, "Sertraline 50 mg tablet");

const notes = await getNotes("sandbox-patient-001");
assert.ok(notes.length >= 1 && notes[0].type, "notes normalized");

const content = await getNoteContent("sandbox-patient-001", "note-1");
assert.match(content.html, /improved sleep/, "decodes text/plain note");

console.log("fhir-adapter test PASSED");
