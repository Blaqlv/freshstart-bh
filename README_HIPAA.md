# HIPAA & PHI Handling — EHR + Eligibility Integrations

This file documents the compliance prerequisites for the v2.1 EHR integration and the
v2.2 insurance-eligibility integration. **Read it before changing `EHR_MODE` or wiring
any real eligibility credentials.**

## SANDBOX is the default and the only safe default

`EHR_MODE` defaults to `sandbox`. In sandbox mode the app serves **synthetic** FHIR data
and reaches no real EHR. A visible banner ("EHR integration is running in SANDBOX mode…")
renders on every EHR-backed screen. Do not remove that banner.

## Before switching `EHR_MODE=production`

You MUST have all of the following in place:

- [ ] A signed **Business Associate Agreement (BAA)** with the EHR vendor.
- [ ] A BAA with **Vercel** covering the runtime that processes/caches FHIR data.
- [ ] A BAA with **Neon** if any FHIR-derived data is stored (note: v2.1 stores none —
      only `fhirPatientId` and link status live in our DB; no clinical content is persisted).
- [ ] A BAA with **Upstash** (token cache) — only OAuth tokens are cached, never PHI bodies.

Confirm BAA status with each vendor directly.

## Credential handling

- Production `EHR_*` / eligibility credentials live **only** in the Vercel **Production**
  environment. Never in `.env.local`, never in Preview, never in the repo.
- Until BAAs are confirmed, build and test against the EHR vendor's **sandbox** with
  synthetic patient data only.

## What v2.1 does and does not store

- Stores: `Patient.fhirPatientId`, `fhirLinkStatus`, `fhirLinkedAt`; audit rows with the
  resource type, a **hashed** patient id, and HTTP status.
- Never stores: appointments, clinical-note content, medications, or any FHIR response body.
- FHIR access tokens are cached in Upstash Redis with a TTL; never written to Postgres.
