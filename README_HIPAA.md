# HIPAA & PHI Handling — Eligibility & EHR Integrations

Compliance prerequisites for the v2.2 eligibility integration (and the v2.1 EHR integration).
**Read before changing `ELIGIBILITY_MODE`/`EHR_MODE` or wiring any real credentials.**

## SANDBOX is the default

`ELIGIBILITY_MODE` defaults to `sandbox`: the app returns synthetic eligibility results and
calls no real payer API. A banner renders on the eligibility admin screens in sandbox mode.

## Before switching `ELIGIBILITY_MODE=production`

- [ ] Signed BAA with the eligibility vendor (Waystar / Availity / Eligible).
- [ ] BAA with Vercel covering the runtime processing eligibility data.
- [ ] BAA with Neon (note: we store no raw responses — only a SHA-256 hash + result status).

Confirm BAA status with each vendor directly.

## Credential handling

Production `ELIGIBILITY_API_*` credentials live ONLY in the Vercel Production environment —
never in `.env.local`, Preview, or the repo. Until BAAs are confirmed, use sandbox only.

## What v2.2 stores / never stores

- Stores: `VerificationAttempt` (insurer name, payer code, result status, SHA-256 response hash,
  staff-review flags, source + link ids). The encrypted `FormSubmission` keeps the full payload
  for staff follow-up (AES-256-GCM).
- Never stores: member ID or DOB in `VerificationAttempt`; raw eligibility responses; coverage
  dollar amounts (copay/deductible are shown to the patient transiently and discarded).
