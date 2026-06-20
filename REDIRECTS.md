# REDIRECTS.md — 301 map (old live slug → new IA path)

> Built from the real nav tree + schema confirmed in the June 2025 snapshot.
> All are permanent (301). Old slugs must keep working indefinitely (SEO).
> Implement in `next.config.js` `redirects()` (or middleware). Re-verify the full
> set during the per-page VERIFY crawl; add any stragglers found.

| Old (live) URL | New IA path | Confidence |
|---|---|---|
| `/about-us` | `/about` | confirmed |
| `/facilities` | `/locations` | confirmed |
| `/our-team` | `/about/leadership` | confirmed |
| `/leadership-team` | `/about/leadership` | confirmed |
| `/careers` | `/careers` (alias `/about/careers`) | confirmed |
| `/services` | `/services` | confirmed |
| `/services/outpatient-services/mental-health-dayton-oh` | `/services/mental-health` | confirmed |
| `/services/outpatient-services/substance-abuse-sober-living-dayton-oh` | `/services/substance-use-treatment` | confirmed |
| `/services/outpatient-services/child-psychiatry-dayton-oh` | `/services/child-psychiatry` | confirmed |
| `/services/outpatient-services/individual-group-therapies-dayton-oh` | `/services/individual-group-therapies` | confirmed |
| `/services/outpatient-services/primary-care-dayton-oh` | `/services/primary-care` | confirmed |
| `/services/recovery-services/judicial-services-dayton-oh` | `/services/judicial-services` | confirmed |
| `/services/recovery-services/case-management-dayton-oh` | `/services/case-management` | confirmed |
| `/services/recovery-services/sober-living-home-dayton-oh` | `/services/sober-living-home` | confirmed |
| `/services/recovery-services/crisis-care-dayton-oh` | `/services/crisis-services` | confirmed |
| `/mental-health-conditions` | `/resources/frequently-asked-questions` (or a conditions hub) | VERIFY |
| `/dayton-main-office` | `/locations/dayton-main` | confirmed |
| `/dayton-outpatient-psych-office` | `/locations/dayton-outpatient` | confirmed |
| `/milford-office` | `/locations/milford` | confirmed |
| (Cincinnati Glenmore — slug VERIFY) | `/locations/cincinnati-glenmore` | VERIFY |
| `/insurance-information` | `/insurance` | confirmed |
| `/patient-resources` | `/resources/forms` | confirmed |
| `/patient-registration` | `/intake` | confirmed |
| `/behavioral-health-blog` | `/resources/blog` | confirmed |
| `/behavioral-health-blog/rss` | `/resources/blog/rss` | confirmed |
| `/reviews` | `/reviews` | confirmed |
| `/leave-a-review` | `/reviews/leave-a-review` | confirmed |
| `/contact-us` | `/contact` | confirmed |
| `/privacy-policy` | `/privacy/privacy-policy` | confirmed |
| `/schedule-appointment` | `/contact#appointment` (Appointment Request form) | confirmed |
| `/sitemap` | `/sitemap.xml` (+ keep HTML sitemap) | confirmed |

## New pages with NO old equivalent (no redirect needed — net-new)

`/about/accreditation`, `/providers` + `/providers/[slug]`, `/patient-portal`,
`/resources/downloads`, `/resources/community-resources`,
`/resources/crisis-resources`, `/accessibility`,
`/privacy/notice-of-privacy-practices`, `/privacy/hipaa-rights`,
`/privacy/cookie-policy`, `/privacy/security-practices`, `/compliance`,
`/crisis-support`, `/admin`, `/dashboard`.
