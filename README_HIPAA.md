# HIPAA & PHI Handling — EHR + Eligibility Integrations

Compliance prerequisites for the v2.1 EHR integration and the v2.2 insurance-eligibility
integration. **Read before changing `EHR_MODE` / `ELIGIBILITY_MODE` or wiring any real
credentials.**

## SANDBOX is the default and the only safe default

- `EHR_MODE` defaults to `sandbox`: the app serves **synthetic** FHIR data and reaches no real
  EHR. A banner ("EHR integration is running in SANDBOX mode…") renders on every EHR-backed
  screen.
- `ELIGIBILITY_MODE` defaults to `sandbox`: the app returns synthetic eligibility results and
  calls no real payer API. A banner renders on the eligibility admin screens.

Do not remove those banners.

## Before switching either to `production`

EHR (`EHR_MODE=production`):

- [ ] A signed **Business Associate Agreement (BAA)** with the EHR vendor.
- [ ] A BAA with **Vercel** covering the runtime that processes/caches FHIR data.
- [ ] A BAA with **Neon** if any FHIR-derived data is stored (note: v2.1 stores none — only
      `fhirPatientId` and link status live in our DB; no clinical content is persisted).
- [ ] A BAA with **Upstash** (token cache) — only OAuth tokens are cached, never PHI bodies.

Eligibility (`ELIGIBILITY_MODE=production`):

- [ ] Signed BAA with the eligibility vendor (Waystar / Availity / Eligible).
- [ ] BAA with Vercel covering the runtime processing eligibility data.
- [ ] BAA with Neon (note: we store no raw responses — only a SHA-256 hash + result status).

Confirm BAA status with each vendor directly.

## Credential handling

Production `EHR_*` / `ELIGIBILITY_API_*` credentials live **only** in the Vercel **Production**
environment — never in `.env.local`, Preview, or the repo. Until BAAs are confirmed, build and
test against sandbox only.

## What we store / never store

EHR (v2.1):

- Stores: `Patient.fhirPatientId`, `fhirLinkStatus`, `fhirLinkedAt`; audit rows with the
  resource type, a **hashed** patient id, and HTTP status.
- Never stores: appointments, clinical-note content, medications, or any FHIR response body.
  FHIR access tokens are cached in Upstash Redis with a TTL; never written to Postgres.

Eligibility (v2.2):

- Stores: `VerificationAttempt` (insurer name, payer code, result status, SHA-256 response hash,
  staff-review flags, source + link ids). The encrypted `FormSubmission` keeps the full payload
  for staff follow-up (AES-256-GCM).
- Never stores: member ID or DOB in `VerificationAttempt`; raw eligibility responses; coverage
  dollar amounts (copay/deductible are shown to the patient transiently and discarded).
