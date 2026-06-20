# Fresh Start Behavioral Health — Website & Platform Rebuild

Modern Next.js rebuild of [freshstartbhinc.com](https://freshstartbhinc.com): public
marketing site + CMS + role-based admin portal + patient & intake portals.
Same brand, modern execution. Hosted on Vercel; database on Neon Postgres.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** (design tokens in `src/app/globals.css` via `@theme`)
- **Prisma** ORM → **Neon** Postgres *(added in the data-layer phase)*
- **Vercel** hosting · **Cloudflare** WAF/DNS in front
- Auth.js (NextAuth v5) + TOTP MFA · Cloudflare R2 for documents · Resend/Postmark email

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Project status (phased build)

| Phase | Status |
|---|---|
| 0 — Discovery & brand audit | ✅ `BRAND.md`, `CONTENT-AUDIT.md`, `REDIRECTS.md` |
| 1 — Scaffold, tokens, layout, crisis banner | ✅ |
| Showcase — Home, Mental Health service, Locations | ✅ |
| 2 — CMS data model + admin editor | ⬜ |
| 3 — Remaining public pages | ⬜ (showcase pages done) |
| 4 — Forms | ⬜ |
| 5 — Admin Portal (RBAC) | ⬜ |
| 6 — Patient Portal (MFA) | ⬜ |
| 7 — Intake Portal | ⬜ |
| 8 — Analytics dashboard | ⬜ |
| 9 — Accessibility audit | ⬜ |
| 10 — SEO/redirects/sitemap, GTM, deploy | ⬜ (redirects scaffolded in `next.config.ts`) |

## Brand tokens

Defined in `src/app/globals.css`. Primary teal `#4ba5aa` is **decorative/large-display
only**; use `#31585d` (`brand-dark`) for text/links on light backgrounds to meet
WCAG 2.2 AA. See `BRAND.md` for the full audit and rationale.

## Analytics

GTM container `GTM-N53753RZ` is wired in `src/app/layout.tsx` to preserve continuity.
A GA4 stream (`G-LYZ8MP7XFT`) was also found on the live site — confirm whether it
should be migrated.

---

## ⚠️ Compliance reality — READ BEFORE COLLECTING REAL PATIENT DATA

This platform is being built **HIPAA-conscious**, which is **not** the same as
**HIPAA-compliant**. The distinction is operational, not just technical:

- True HIPAA compliance requires signed **Business Associate Agreements (BAAs)** with
  **every vendor that touches Protected Health Information (PHI)** — hosting (Vercel),
  database (Neon), file storage (Cloudflare R2), and email (Resend/Postmark).
- These vendors generally **do not offer BAAs on free tiers**; BAAs are typically
  paid/enterprise features. **Confirm current terms with each vendor directly** before
  launch, since they change.

**What this means in practice:**

- The **public site, CMS, and admin portal** never handle PHI — no issue there.
- The **Patient Portal** and **Intake Portal** *will* collect real PHI (clinical
  history, insurance, documents). **Do not go live with real patient data** until
  either (a) a BAA is in place with every vendor in that data path, or (b) intake/portal
  functionality is routed through a dedicated, BAA-covered clinical intake/EHR vendor
  instead of custom storage.
- We are building the **UI, UX, and data model now**; the BAA gate is a launch
  blocker for real-PHI features, tracked here and to be raised with the client.

**Technical PHI safeguards in scope:** application-layer AES-256 field encryption (on
top of Postgres at-rest encryption), immutable audit logging of all PHI access, MFA on
portal logins, 15-minute idle session timeout, virus-scan-before-store on uploads, and
a no-PHI notice on the public Contact form.
