# BRAND.md — Fresh Start Behavioral Health

> Phase 0 brand audit. Extracted from the live site's archived June 2025 snapshot
> (`web.archive.org/web/20250624155010`) because the live origin is behind a
> Cloudflare managed challenge that blocks non-browser clients.
> Source files: `docs/_discovery/fs_home.html`, `docs/_discovery/styles.css`.
>
> **Rule:** these are the real brand tokens. Reuse them as Tailwind theme tokens /
> CSS variables. Do **not** introduce a new palette. If a pairing fails WCAG AA,
> adjust the *pairing*, not the brand color (see Accessibility notes below).

## Platform of record (current site)

- Built on **DoctorLogic** (a hosted healthcare-website CMS). Site ID `2824`,
  filing name `FreshStartBehavioralHealth`.
- This is the system we are replacing with a custom Next.js + Neon stack.

## Color palette

| Token | Hex / value | Usage on live site |
|---|---|---|
| `--primary` (teal) | `#4ba5aa` | Feature heading bg, buttons, link accents, map water |
| `--primary-hover` (deep teal) | `#5497a0` | Button hover, CTA hover, toggle checked |
| `--primary-dark` (darkest teal) | `#31585d` | Button active state |
| `--primary-tint` | `rgba(75,165,170,0.1)` | Light section backgrounds |
| `--accent-red` | `#ed1c24` | Required-field / error indicator |
| `--star-gold` | `rgb(255,221,0)` | Review star ratings |
| `--ink` | `#000` / `#333` | Body text, headings |
| `--surface` | `#fff` | Page background, cards |
| `--border` | `#ededed` | Form field borders |
| `--muted` | `#c4c4c4` / `#ccc` | Disabled states, placeholder icons |

Proposed Tailwind theme mapping:
```
brand:        { DEFAULT: '#4ba5aa', hover: '#5497a0', dark: '#31585d',
                tint: 'rgba(75,165,170,0.1)' }
accent:       '#ed1c24'
gold:         '#ffdd00'
```

> **WCAG 2.2 AA adjustments (Phase 9 audit).** The hues above are the brand
> family; two *pairings* were corrected so white-on-color text clears 4.5:1
> (the brief permits adjusting the pairing, not the brand color):
> - **Accent red implemented as `#cc1a22`** (deepened from the harvested
>   `#ed1c24`). White-on-accent (crisis banner) and accent-on-white (links /
>   error text) were both at 4.35:1; the deeper shade clears 4.5:1 both ways.
> - **White text never sits on primary teal `#4ba5aa`** (2.89:1). Logo badges,
>   the hero, and CTA banners use `brand-dark #31585d` (~7.4:1) instead. Teal
>   remains for decorative fills, progress bars, and chart bars (no text).
>
> Verified by an automated axe-core WCAG 2.2 AA scan across 38 routes
> (`docs/a11y-scan.mjs`) → 0 violations. See `docs/a11y-report.json`.

## Typography

- **Primary + heading font:** `Rubik, sans-serif` (Google Fonts; preconnected to
  `fonts.googleapis.com` / `fonts.gstatic.com`). No separate heading/body face —
  the site uses Rubik for everything (`--font-family` and `--font-family-alt` are
  both Rubik).
- Action: load Rubik via `next/font/google` (weights ~400/500/600/700).

## Logo & icons

- **Logo (SVG):** `https://assets.freshstartbhinc.com/Images/Sites/F/FreshStartBehavioralHealth/MasterPage/1263619.svg`
- **Favicon:** `https://assets.freshstartbhinc.com/Images/Sites/F/FreshStartBehavioralHealth/favicon.ico`
- **Apple touch / splash:** generated from `Splash.png` in the same MasterPage dir.
- **Accreditation badge present today — OHMAS:** `https://assets.freshstartbhinc.com/Images/Sites/F/FreshStartBehavioralHealth/MasterPage/1340239.png` (links to `https://mha.ohio.gov/`).
  - **CARF** badge is named in the brief as also displayed; not located in the
    homepage snapshot — confirm on `/about-us` / interior pages during build and
    carry both onto `/about/accreditation` and `/compliance`.

> **TODO (asset capture):** download the logo SVG, favicon, and OHMAS badge into
> `/public/brand/` during scaffold. (Asset host may also sit behind Cloudflare —
> pull from the Wayback `assets.freshstartbhinc.com` snapshots if blocked.)

## Brand voice

Warm, hopeful, plain-language, recovery-forward, non-judgmental. Tagline:
**"Everyone Deserves a Fresh Start"** / philosophy line *"'Fresh Start' is more
than just our name, it's also our philosophy."* Section voice examples:
"Helping People Gain Power In Their Life", "The Support You Need", "Your Partners
in Mental Health". Keep this register for all new (net-new) page copy.

## Analytics continuity (must preserve)

- **Google Tag Manager:** `GTM-N53753RZ` (matches brief).
- **GA4:** `G-LYZ8MP7XFT` (found in snapshot; not in brief — preserve too).
- DoctorLogic call-tracking & channel-attribution cookie (`__dl`) is platform-
  specific and will **not** be carried over.

## Accessibility note on the palette

- Primary teal `#4ba5aa` on white ≈ 2.6:1 contrast — **fails** WCAG AA for normal
  text. On the live site it's used mostly as a *background* with white text
  (white on `#4ba5aa` ≈ 2.6:1 — also borderline) and for large headings.
- Resolution per brief: **keep the brand teal**, but for AA-compliant text use
  `--primary-dark #31585d` (white on `#31585d` ≈ 7:1, passes AA/AAA) for text/links
  on light backgrounds, and reserve `#4ba5aa` for large display type, fills, and
  decorative surfaces. Verify every final pairing with an automated contrast check
  in the Phase 9 accessibility pass.
