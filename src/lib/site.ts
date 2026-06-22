/**
 * Site-wide seed content for Fresh Start Behavioral Health.
 *
 * Sourced from the Phase 0 content audit (see CONTENT-AUDIT.md). This is the
 * single source of truth for the static showcase build; in a later phase it
 * migrates into the Postgres-backed CMS. Copy is verbatim from the live site
 * where available, or written in-brand where flagged "new".
 */

export const site = {
  name: "Fresh Start Behavioral Health, Inc.",
  shortName: "Fresh Start Behavioral Health",
  // Canonical production origin (override per-env with NEXT_PUBLIC_SITE_URL).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://freshstartbhinc.com",
  tagline: "Everyone Deserves a Fresh Start",
  phone: "937-579-0073",
  phoneHref: "tel:+19375790073",
  sameDayNote: "Same-day appointments if you call our offices before 10 AM.",
  facebook: "https://www.facebook.com/FreshStartBHInc/",
  google: "https://goo.gl/maps/vSR1AU4wNex7CvRt6",
  rating: { value: 4.8, count: 8, source: "Google" },
  gtmId: "GTM-N53753RZ",
  ga4Id: "G-LYZ8MP7XFT",
} as const;

export type Location = {
  slug: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  blurb: string;
  lat: number;
  lng: number;
};

export const locations: Location[] = [
  {
    slug: "dayton-main",
    name: "Dayton Main Office",
    street: "6929 North Main Street",
    city: "Dayton",
    state: "OH",
    zip: "45415",
    blurb:
      "Treatment includes primary care, substance use and psychiatric disorders, psychotherapy, case management, and various mental health services.",
    lat: 39.8290065579416,
    lng: -84.2486768166427,
  },
  {
    slug: "dayton-outpatient",
    name: "Dayton Outpatient Office",
    street: "8015 North Main Street",
    city: "Dayton",
    state: "OH",
    zip: "45415",
    blurb:
      "Our outpatient facility in Dayton offers outpatient psychiatry, psychotherapy, and primary care for a range of mental health needs.",
    lat: 39.8396298705105,
    lng: -84.2594941589711,
  },
  {
    slug: "milford",
    name: "Milford Office",
    street: "732 Lila Avenue",
    city: "Milford",
    state: "OH",
    zip: "45150",
    phone: "513-817-0051",
    blurb:
      "A psychiatric treatment and counseling center serving patients of all ages in Milford and the surrounding communities.",
    lat: 39.1761694302732,
    lng: -84.2848620029634,
  },
  {
    slug: "cincinnati-glenmore",
    name: "Cincinnati – Glenmore Office",
    street: "3425 Glenmore Avenue",
    city: "Cincinnati",
    state: "OH",
    zip: "45211",
    phone: "513-386-8919",
    blurb:
      "Behavioral health, psychiatry, and substance use treatment serving the greater Cincinnati area.",
    lat: 39.1572,
    lng: -84.6066, // approximate — verify before launch
  },
];

export type ServiceTile = {
  slug: string;
  title: string;
  blurb: string;
};

/** The 6 homepage doorway tiles (verbatim live copy). */
export const homeServiceTiles: ServiceTile[] = [
  {
    slug: "mental-health",
    title: "Mental Health",
    blurb:
      "We offer personalized treatments for a wide range of mental health disorders so you can manage your symptoms and feel more empowered going forward.",
  },
  {
    slug: "primary-care",
    title: "Primary Care",
    blurb:
      "Primary care at Fresh Start Behavioral Health, Inc. involves physical and mental health services so you can feel better in both body and mind.",
  },
  {
    slug: "individual-group-therapies",
    title: "Therapy Sessions",
    blurb:
      "Our counselors offer therapy sessions for adults and children, giving patients a safe space to discuss their issues so they can begin healing.",
  },
  {
    slug: "judicial-services",
    title: "Judicial Services",
    blurb:
      "We collaborate with the courts, as well as probation and parole services, to help rehabilitate and turn a patient's life around.",
  },
  {
    slug: "crisis-services",
    title: "Crisis Care",
    blurb:
      "When you need urgent attention for your mental health, our certified counselors are here to provide the support you need with crisis care services.",
  },
  {
    slug: "all",
    title: "All Services",
    blurb:
      "Browse our full list of mental health and addiction services and learn more about how our dedicated team can help you get back on track.",
  },
];

export type Testimonial = { quote: string; author: string; source: string };

export const testimonials: Testimonial[] = [
  {
    quote:
      "Very good place to help you with what you need help with. Staff very professional, and courteous. Highly recommended if you need help with recovery, or mental health in general. Trust the process, and be honest. They will help you.",
    author: "A.M.",
    source: "Google",
  },
  {
    quote:
      "Great place if you are serious about getting your life straightened out! Has a lot of structure and help for the people that are ready for it! It has changed my life for the better so far!",
    author: "E.S.",
    source: "Google",
  },
  {
    quote:
      "This program helped me get my life back. I came in broken and they had my back the entire time. I am one of the first few clients to come to the program and I don't think I would have made it this far without their full support.",
    author: "M.S.",
    source: "Google",
  },
  {
    quote:
      "What a program!! The staff are awesome. Anyone needing treatment for substance abuse or any mental health issues should really check this place out. Every need is catered to. I was welcomed with open arms and never judged. If I could give them 10 stars, I would. Thank you to all for everything you do!!",
    author: "R.K.",
    source: "Google",
  },
];

/** Accepted insurance (authoritative list from the brief). */
export const acceptedInsurance: string[] = [
  "Aetna",
  "Anthem",
  "AultCare",
  "Buckeye",
  "Humana",
  "Medicaid (Aetna Better Health of OH, AmeriHealth, Anthem, Buckeye, CareSource, Humana, Molina, Paramount, UHC Community Plan)",
  "Medical Mutual of Ohio",
  "Medicare",
  "MediGold",
  "Ohio Medicaid",
  "SummaCare",
  "Tricare",
  "UnitedHealthcare / Optum",
  "VA Community Care Network",
];

export const CRISIS_BANNER =
  "If you are experiencing a mental health emergency, call 911 or go to your nearest emergency department.";

export const NO_PHI_NOTICE =
  "Please do not include medical information or confidential health information in this form.";

/** Primary navigation (new IA). */
export const primaryNav = [
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Staff", href: "/providers" },
      { label: "Leadership", href: "/about/leadership" },
      { label: "Careers", href: "/about/careers" },
      { label: "Accreditation", href: "/about/accreditation" },
    ],
  },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Mental Health", href: "/services/mental-health" },
      { label: "Substance Use Treatment", href: "/services/substance-use-treatment" },
      { label: "Psychiatry", href: "/services/psychiatry" },
      { label: "Child Psychiatry", href: "/services/child-psychiatry" },
      { label: "Therapies", href: "/services/individual-group-therapies" },
      { label: "Crisis Services", href: "/services/crisis-services" },
    ],
  },
  { label: "Locations", href: "/locations" },
  { label: "Insurance", href: "/insurance" },
  {
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Blog", href: "/resources/blog" },
      { label: "FAQs", href: "/resources/frequently-asked-questions" },
      { label: "Forms", href: "/resources/forms" },
      { label: "Crisis Resources", href: "/resources/crisis-resources" },
    ],
  },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNav = [
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Patient Portal", href: "/patient-portal" },
  { label: "Insurance", href: "/insurance" },
  { label: "Resources", href: "/resources" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
  // Reviews moved here from the top nav (Prompt 4, Change A).
  { label: "Patient Reviews", href: "/reviews" },
  { label: "Leave a Review", href: "/reviews/leave-a-review" },
  { label: "Privacy Policy", href: "/privacy/privacy-policy" },
  { label: "Notice of Privacy Practices", href: "/privacy/notice-of-privacy-practices" },
  { label: "Accessibility Statement", href: "/accessibility" },
  { label: "Compliance Information", href: "/compliance" },
  { label: "Crisis Support", href: "/crisis-support" },
] as const;
