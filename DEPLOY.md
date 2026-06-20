# Deployment runbook — Fresh Start Behavioral Health

Production target: **Vercel** (app + API routes + cron) · **Neon** (Postgres) ·
**Cloudflare** (DNS proxy + WAF) · **Cloudflare R2** (documents + backups).
No AWS anywhere in the stack.

> ⚠️ **Compliance gate (read first).** The Patient Portal and Intake Portal
> collect real PHI. Do **not** route real patient data through production until a
> **BAA** is signed with every vendor in that path (Vercel, Neon, Cloudflare,
> email). The public site, CMS, and admin portal never handle PHI and can launch
> first. See README §Compliance.

## 1. Database (Neon)
1. Create a Neon project; copy the **pooled** connection string.
2. Link it to the Vercel project via Vercel's first-party Neon integration
   (auto-injects `DATABASE_URL` and gives a fresh Neon branch per preview).
3. Apply schema + seed:
   ```bash
   npm run db:migrate     # prisma migrate deploy in CI/prod
   npm run db:seed        # optional: seed reference content (rotate the dev password!)
   ```

## 2. App (Vercel)
1. Import the GitHub repo into Vercel (CI/CD on every push; preview per PR).
2. Set environment variables (see `.env.example`): `AUTH_SECRET`,
   `APP_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, plus R2 and email
   keys when ready. Generate secrets with `openssl rand -hex 32`.
3. Deploy. `vercel.json` registers the nightly backup cron (`/api/cron/backup`,
   07:00 UTC). Vercel calls it with `Authorization: Bearer $CRON_SECRET`.

## 3. Edge (Cloudflare)
1. Point the domain's DNS at Vercel in **proxied** mode (orange cloud), free plan,
   for WAF + DDoS.
2. Confirm `NEXT_PUBLIC_SITE_URL` matches the production origin so
   `sitemap.xml` / `robots.txt` emit canonical URLs.

## 4. Backups (R2) — before any real PHI
`/api/cron/backup` is the secured seam. Wire R2 credentials (`R2_*`) and the
dump→encrypt→upload step; until configured it authenticates, logs
`backup.skipped` to the audit log, and returns `not_configured` so a monitor can
alert. This is an *extra* layer beyond Neon's point-in-time restore.

## 5. SEO cutover
- 301/308 legacy redirects live in `next.config.ts` (verified resolving).
- `sitemap.xml` and `robots.txt` are generated (robots disallows
  `/admin`, `/dashboard`, `/patient-portal`, `/intake`, `/api`).
- GTM container `GTM-N53753RZ` is wired in `src/app/layout.tsx`. A GA4 stream
  (`G-LYZ8MP7XFT`) was also found on the live site — wire only if desired.
- After go-live: submit `sitemap.xml` in Google Search Console and spot-check
  top legacy URLs resolve to their new paths.

## QA before launch
```bash
npm run build      # production build
npm run a11y       # axe-core WCAG 2.2 AA scan (needs `npm start` running) → 0 violations
```
