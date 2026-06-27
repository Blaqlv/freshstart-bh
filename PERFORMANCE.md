# Performance baseline (Version 1.1 — B2)

Core Web Vitals / Lighthouse tracking so future regressions are visible. Run
Lighthouse against the **deployed preview URL** (not local dev, which is
unoptimised) for at least the homepage, a service page, and a location page.

## Targets

| Category        | Target |
| --------------- | ------ |
| Performance     | ≥ 90   |
| Accessibility   | ≥ 95   |
| Best Practices  | ≥ 90   |
| SEO             | = 100  |

## How to capture

```bash
# Against the Vercel preview URL
npx lighthouse https://<preview>.vercel.app/                       --only-categories=performance,accessibility,best-practices,seo --view
npx lighthouse https://<preview>.vercel.app/services/mental-health --only-categories=performance,accessibility,best-practices,seo --view
npx lighthouse https://<preview>.vercel.app/locations/dayton-main  --only-categories=performance,accessibility,best-practices,seo --view
```

## Baseline scores

> Fill in after the first run against a preview deployment. Re-run before each
> release and compare.

| Page              | Perf | A11y | Best Practices | SEO | Date |
| ----------------- | ---- | ---- | -------------- | --- | ---- |
| Homepage          | —    | —    | —              | —   | —    |
| Service page      | —    | —    | —              | —   | —    |
| Location page     | —    | —    | —              | —   | —    |

## Notes on the build's existing safeguards

- GTM is consent-gated and `afterInteractive` (A1), so it is not render-blocking
  and does not load at all before consent — protecting LCP/TBT.
- Custom font (`Rubik`) uses `display: "swap"` (see `src/app/layout.tsx`).
- Default social image is generated via `next/og` (`src/app/opengraph-image.tsx`).

## Things to verify / fix if a run misses target

- `<Image>` elements have explicit `width`/`height` (cumulative layout shift).
- Above-the-fold hero images use the `priority` prop.
- No new render-blocking third-party scripts were added outside the consent gate.
