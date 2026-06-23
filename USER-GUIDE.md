# Fresh Start Behavioral Health — Platform User Guide

*A plain-language guide to your new website and staff platform. Written for the people who will run it day to day — no technical background assumed.*

---

## 1. What you have

Your new platform is one connected system with four parts:

| Area | Who uses it | What it's for |
|---|---|---|
| **Public website** | Anyone on the internet | Your marketing site — services, providers, locations, insurance, reviews, blog, contact |
| **Admin Portal** | Your staff | Edit the website, manage providers/reviews, handle form submissions and intakes, run the practice |
| **Patient Portal** | Existing patients | Secure messages, appointments, refill requests, documents, and billing statements |
| **Intake Portal** | Prospective patients | A guided new-patient sign-up they can complete (and pause/resume) on their own |

There is also a **Analytics Dashboard** for leadership (KPIs and trends, no patient details).

Everything shares one design and one database, so a change you publish in the Admin Portal appears on the public site immediately.

---

## 2. How to sign in

Each area has its own separate login. Bookmark the ones you use.

| Area | Web address |
|---|---|
| Admin Portal | `https://freshstart-bh.vercel.app/admin/login` |
| Analytics Dashboard | `https://freshstart-bh.vercel.app/dashboard` |
| Patient Portal | `https://freshstart-bh.vercel.app/patient-portal/login` |
| Intake (new patients) | `https://freshstart-bh.vercel.app/intake` |

_(Replace the address above with your own domain once it goes live.)_

**Two-step login (MFA).** Staff and patient logins use an extra security code from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.). On your first login you'll be shown a QR code to scan once; after that the app generates a fresh 6-digit code each time. Keep your phone handy when you sign in.

> **Starter accounts.** The system ships with one demo account per staff role and a demo patient account, all using a placeholder password. **These must be changed before real use** — see the launch checklist in Section 9.

---

## 3. Staff roles — who can do what

Access is controlled by role, so people only see what their job needs. The six roles are:

- **Administrator** — full access, including staff user management and security settings.
- **Clinical Director** — clinical oversight, providers, intakes, incidents.
- **Compliance Officer** — audit log, incident reports, compliance views.
- **Receptionist / Front Desk** — appointments, form submissions, day-to-day front-office work.
- **Provider** — provider-facing views.
- **Billing Staff** — billing and insurance-related views.

If someone can't see a page or button they expect, it's almost always a role permission — an Administrator can adjust it under **Users**.

---

## 4. Running the website (Admin Portal)

After signing in at `/admin/login` you land on the admin home. Key sections:

### Pages & content
- **Pages** — edit the content of marketing pages using a block editor (headings, text, images, sections). Save as a **Draft**, **Preview** exactly how it will look, then **Publish** when ready. Drafts are never visible to the public.
- **Providers** — add or update your clinicians: name, photo, bio, specialties, locations.
- **Testimonials / Reviews** — approve and manage the patient reviews shown on the site.

### Front-office work
- **Submissions** — appointment-request and insurance-verification forms that visitors send from the public site. These are stored encrypted; opening one is logged.
- **Forms** — manage the public-facing form definitions.
- **Intake** — review new-patient intake packets submitted through the Intake Portal (full detail in Section 7).

### Oversight & administration
- **Incidents** — log and track incident reports.
- **Audit** — a permanent, read-only record of who did what (logins, edits, who opened which patient record). This cannot be altered or deleted — that's by design, for compliance.
- **Users** — *(Administrator only)* add staff, set roles, deactivate people who leave.
- **Security** — *(Administrator only)* manage your own two-step (MFA) setup and security settings.

> **Tip — the publish workflow.** Nothing you type goes live until you click **Publish**. Use **Draft → Preview → Publish** for anything customer-facing so you can check it first.

---

## 5. The Patient Portal

Patients sign in at `/patient-portal/login` (with two-step verification) and can:

- **Messages** — secure, private messaging with your team.
- **Appointments** — view their scheduled visits.
- **Refills** — request prescription refills.
- **Documents** — view and download documents you've shared, and upload their own (e.g., insurance cards). Every upload is virus-scanned and encrypted before it's stored.
- **Billing** — view statements.
- **Security** — manage their own two-step login.

For privacy, the portal **automatically signs a patient out after 15 minutes** of inactivity. Sensitive health information is encrypted, and every time a record is opened it's recorded in the audit log.

---

## 6. The Intake Portal (new patients)

Prospective patients start at `/intake` and move through a guided, multi-step form (history, insurance, consent, e-signature).

Two things make it patient-friendly:
- **Save and resume** — they can stop partway and pick up later using a link emailed to them plus a private resume code, so nothing is lost.
- **It's separate from the Patient Portal** — they don't need an account first.

When they finish, the packet arrives **encrypted** in your **Admin → Intake** queue for your team to review and act on. As with all patient data, access is logged.

---

## 7. Analytics Dashboard (leadership)

At `/dashboard`, authorized leaders see practice health at a glance:

- Appointment and conversion numbers
- Medicaid mix and patient-satisfaction measures
- Six-month trend lines
- Provider, incident, and compliance panels
- Intake funnel and CARF-related indicators

**Important:** the dashboard shows **aggregate numbers only** — no individual patient information ever appears here.

---

## 8. Security & compliance — please read

This platform was built to be **HIPAA-conscious**, with strong technical safeguards:

- Sensitive patient data is encrypted with bank-grade (AES-256) encryption, on top of the database's own encryption.
- Every access to patient information is recorded in a tamper-proof audit log.
- Two-step (MFA) login on all staff and patient accounts.
- 15-minute automatic sign-out on the Patient Portal.
- All uploaded files are virus-scanned before they're stored.
- The public Contact form carries a notice telling people **not** to send health details through it.

### The one thing you must do before going live with real patient data

**HIPAA-conscious is not the same as HIPAA-compliant.** True compliance requires a signed **Business Associate Agreement (BAA)** with **every outside vendor that touches patient data** — your hosting, database, file storage, and email providers. These agreements are usually a paid/enterprise feature and are **not** included on free plans.

- The **public website, content editor, and admin tools never handle patient health data** — these can launch right away.
- The **Patient Portal and Intake Portal do collect real health data.** **Do not turn these on for real patients** until either (a) BAAs are in place with every vendor in that path, or (b) intake/portal data is routed through a dedicated, BAA-covered clinical/EHR vendor.

Your technical team has this flagged as a hard launch gate. Please confirm BAA terms directly with each vendor before collecting any real patient information.

---

## 9. Going live — checklist

The platform is fully built and tested. These remaining steps require **your** accounts, domain, and vendor decisions, and are handled by whoever deploys the site:

1. **Change all starter passwords** and remove or rename the demo accounts (one per role + the demo patient).
2. **Connect your domain** and turn on the security/firewall layer.
3. **Set up the vendor accounts** for hosting, database, file storage, and email — and **sign the BAAs** before enabling patient features.
4. **Turn on the virus scanner** for uploads (required before accepting real patient files).
5. **Confirm analytics** (your existing Google Tag Manager is already wired in; decide whether to keep the older Google Analytics stream too).
6. **Submit the new site map to Google** and spot-check that old web addresses redirect to the new ones.

A detailed, technical version of these steps lives in `DEPLOY.md` for your developer/IT contact.

---

## 10. Day-to-day quick reference

| I want to… | Go to |
|---|---|
| Edit a web page | Admin → **Pages** → edit → Preview → **Publish** |
| Add/update a clinician | Admin → **Providers** |
| Approve a patient review | Admin → **Testimonials / Reviews** |
| See appointment & insurance requests | Admin → **Submissions** |
| Review a new-patient intake | Admin → **Intake** |
| Add a staff member or change a role | Admin → **Users** *(Administrator)* |
| See who accessed what | Admin → **Audit** |
| Check practice KPIs | **Dashboard** |
| Reset my two-step login | Admin → **Security** (or Patient → **Security**) |

---

### Need help?

For technical questions, vendor setup, or anything in the launch checklist, contact your developer/IT partner and point them to `README.md` and `DEPLOY.md` in the project. This guide covers everyday use; those cover the technical operation.
