/**
 * Seed content for CMS-managed narrative & legal pages (rendered by the
 * (site)/[...slug] catch-all via BlockRenderer). Copy is plain-language and
 * in-brand. Legal pages (privacy, HIPAA, cookies, security) are reasonable
 * starting drafts and MUST be reviewed by counsel / the privacy officer before
 * launch — flagged inline.
 */

type SeedBlock = Record<string, unknown> & { type: string };
export type SeedPage = {
  slug: string;
  title: string;
  seoDescription?: string;
  blocks: SeedBlock[];
};

const hero = (heading: string, body?: string): SeedBlock => ({ type: "hero", heading, body });
const text = (heading: string, body: string): SeedBlock => ({ type: "richText", heading, body });
const cta = (heading: string, body: string, ctaLabel = "Contact Us", ctaHref = "/contact"): SeedBlock => ({
  type: "ctaBanner",
  heading,
  body,
  ctaLabel,
  ctaHref,
});

const LEGAL_NOTE =
  "This is a starting draft for review by Fresh Start Behavioral Health and its legal/compliance team. It is not legal advice and should be finalized before publication.";

export const seedPages: SeedPage[] = [
  {
    slug: "about",
    title: "About Us",
    seoDescription: "Learn about Fresh Start Behavioral Health — our mission, vision, and whole-person model of care across Ohio.",
    blocks: [
      hero("About Fresh Start Behavioral Health", "“Fresh Start” is more than our name — it’s our philosophy."),
      text("Our mission", "We provide personalized, compassionate behavioral health and substance use care so every person we serve can take back control of their life. Our model combines psychiatric care, counseling, behavioral therapy, primary care, and recovery support."),
      text("Our vision", "A community where everyone has access to respectful, effective mental health and addiction care — and a genuine fresh start."),
      text("Diversity & inclusion", "We welcome people of every background, identity, and circumstance. We emphasize open communication, mutual respect, trust, compassion, and empathy with every patient, tailoring each plan to the individual."),
      text("Community partnerships", "We collaborate with courts, probation and parole services, primary care providers, and community organizations to connect people with the support they need."),
      { type: "teamGrid", heading: "Our leadership & team" },
      cta("Ready to start your fresh start?", "Reach out today — same-day appointments may be available."),
    ],
  },
  {
    slug: "about/leadership",
    title: "Leadership & Team",
    seoDescription: "Meet the clinical leadership and care team at Fresh Start Behavioral Health.",
    blocks: [
      hero("Leadership & Team", "Seasoned behavioral health professionals led by Medical Director Irfan Dahar, MD, and Executive Director Ebenezer Aluma, PhD, PA-C."),
      { type: "teamGrid", heading: "Our providers" },
      text("Our broader team", "Our team includes psychiatrists, physician assistants, nurse practitioners, social workers, licensed professional clinical counselors, licensed drug and chemical dependence counselors, chemical dependency counseling assistants, and qualified behavioral health specialists."),
    ],
  },
  {
    slug: "about/accreditation",
    title: "Accreditation",
    seoDescription: "Fresh Start Behavioral Health is accredited and certified to provide quality behavioral health care in Ohio.",
    blocks: [
      hero("Accreditation & Certification", "Our commitment to quality and safety is independently recognized."),
      text("CARF Accreditation", "CARF (the Commission on Accreditation of Rehabilitation Facilities) accreditation reflects our ongoing commitment to meeting rigorous, internationally recognized standards for quality behavioral health care."),
      text("OHMAS Certification", "We are certified by the Ohio Department of Mental Health and Addiction Services (OhioMHAS), the state authority for behavioral health treatment providers."),
      cta("Questions about our credentials?", "Our team is happy to help.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "about/careers",
    title: "Careers",
    seoDescription: "Join the Fresh Start Behavioral Health team. Explore careers in behavioral health across Ohio.",
    blocks: [
      hero("Careers at Fresh Start", "Help people gain power in their lives. Join a team that values compassion, respect, and growth."),
      text("Why work with us", "We are a mission-driven behavioral health provider serving the Dayton, Cincinnati, and Milford communities. We offer a supportive, collaborative environment and the chance to make a real difference."),
      text("How to apply", "Send your resume and a brief note about your interest to our team via the contact page, and we’ll be in touch about current openings."),
      cta("Interested in joining us?", "Reach out and tell us about yourself.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    seoDescription: "Careers at Fresh Start Behavioral Health.",
    blocks: [
      hero("Careers at Fresh Start", "Help people gain power in their lives."),
      text("Join our team", "We’re always interested in compassionate, qualified behavioral health professionals. Reach out through our contact page to learn about current openings."),
      cta("Interested in joining us?", "Tell us about yourself.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "insurance-help",
    title: "Insurance & Payment Help",
    seoDescription: "Understanding insurance and payment options at Fresh Start Behavioral Health.",
    blocks: [
      hero("Insurance & Payment", "We accept most major insurance plans and Ohio Medicaid."),
      text("Need help verifying your benefits?", "Our team will verify your coverage before your first visit. Visit our insurance page for the full list of accepted plans, or contact us and we’ll help."),
      cta("Verify your insurance", "We’ll confirm your benefits before your first visit.", "See Accepted Insurance", "/insurance"),
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    seoDescription: "Fresh Start Behavioral Health is committed to digital accessibility and WCAG 2.2 AA compliance.",
    blocks: [
      hero("Accessibility Statement", "We are committed to making our website usable by everyone."),
      text("Our commitment", "Fresh Start Behavioral Health strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. We continually work to improve the accessibility of our site for people of all abilities."),
      text("Need an accommodation?", "If you experience any difficulty accessing part of this site, or need information in an alternative format, please contact us and we will work to provide the information you need. You can reach us at 937-579-0073 or through our contact page."),
      cta("Request an accommodation", "We’re here to help you access our services.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "compliance",
    title: "Compliance Information",
    seoDescription: "Fresh Start Behavioral Health's commitment to compliance, privacy, and quality.",
    blocks: [
      hero("Compliance", "Quality, privacy, and ethical care are foundational to everything we do."),
      text("Standards we uphold", "We maintain compliance with CARF accreditation standards and OhioMHAS certification requirements, and we follow applicable federal and state regulations governing behavioral health care, including HIPAA and 42 CFR Part 2 for substance use treatment records."),
      text("Reporting a concern", "If you have a compliance, privacy, or quality concern, please contact us. Reports are taken seriously and handled confidentially. " + LEGAL_NOTE),
      cta("Have a compliance question?", "Our compliance team is here to help.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "crisis-support",
    title: "Crisis Support",
    seoDescription: "If you are in crisis, help is available now. Emergency and crisis resources from Fresh Start Behavioral Health.",
    blocks: [
      hero("In crisis? Help is available now.", "If you are experiencing a mental health emergency, call 911 or go to your nearest emergency department."),
      text("Immediate help", "988 Suicide & Crisis Lifeline — call or text 988, available 24/7.\n\nCrisis Text Line — text HOME to 741741.\n\nIf you or someone else is in immediate danger, call 911."),
      text("Crisis services at Fresh Start", "When you need urgent attention for your mental health, our certified counselors provide crisis care services. Call us at 937-579-0073 during business hours."),
      cta("Talk to our team", "We’re here to support you.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "privacy/privacy-policy",
    title: "Privacy Policy",
    seoDescription: "Fresh Start Behavioral Health website privacy policy.",
    blocks: [
      hero("Privacy Policy"),
      text("Website privacy", "This policy describes how the Fresh Start Behavioral Health website collects and uses information. We collect only the information you choose to provide (for example, through our contact form) and standard analytics data used to improve our site. We do not sell your information. " + LEGAL_NOTE),
      text("Do not submit health information online", "Please do not include medical or confidential health information in our website forms. For protected health information, contact us by phone or through our secure patient portal."),
    ],
  },
  {
    slug: "privacy/notice-of-privacy-practices",
    title: "Notice of Privacy Practices",
    seoDescription: "How Fresh Start Behavioral Health may use and disclose your protected health information (HIPAA).",
    blocks: [
      hero("Notice of Privacy Practices"),
      text("Your health information is protected", "This notice describes how medical information about you may be used and disclosed, and how you can get access to this information. Please review it carefully. " + LEGAL_NOTE),
      text("Our responsibilities", "We are required by law to maintain the privacy of your protected health information, to provide you this notice of our legal duties and privacy practices, and to notify you following a breach of unsecured protected health information."),
      text("Substance use records (42 CFR Part 2)", "Federal law provides additional protection for substance use disorder treatment records. We will not disclose these records without your written consent except as permitted by law."),
    ],
  },
  {
    slug: "privacy/hipaa-rights",
    title: "Your HIPAA Rights",
    seoDescription: "Your rights regarding your protected health information under HIPAA.",
    blocks: [
      hero("Your HIPAA Rights"),
      text("What you can do", "Under HIPAA you have the right to: get a copy of your health and claims records; correct your health record; request confidential communications; ask us to limit the information we share; get a list of those with whom we’ve shared your information; get a copy of this privacy notice; and file a complaint if you feel your rights are violated. " + LEGAL_NOTE),
      cta("Exercise your rights", "Contact us to make a request regarding your health information.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "privacy/cookie-policy",
    title: "Cookie Policy",
    seoDescription: "How Fresh Start Behavioral Health uses cookies and similar technologies.",
    blocks: [
      hero("Cookie Policy"),
      text("How we use cookies", "Our website uses cookies and similar technologies to operate the site, remember your preferences, and understand how the site is used (analytics). You can control cookies through your browser settings. " + LEGAL_NOTE),
    ],
  },
  {
    slug: "privacy/security-practices",
    title: "Security Practices",
    seoDescription: "How Fresh Start Behavioral Health protects your information.",
    blocks: [
      hero("Security Practices"),
      text("How we protect your data", "We use industry-standard safeguards to protect information, including encryption in transit and at rest, access controls and role-based permissions, multi-factor authentication for staff and patient portals, audit logging, and routine backups. Protected health information collected through our patient and intake portals is encrypted at the application layer. " + LEGAL_NOTE),
    ],
  },
  {
    slug: "resources",
    title: "Resources",
    seoDescription: "Patient resources, forms, FAQs, and community and crisis resources from Fresh Start Behavioral Health.",
    blocks: [
      hero("Resources", "Helpful information, forms, and support for patients and families."),
      text("What you'll find here", "Browse our blog, frequently asked questions, downloadable forms, community resources, and crisis resources. If you can’t find what you need, contact us."),
      cta("Need something specific?", "Our team is happy to help.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "resources/frequently-asked-questions",
    title: "Frequently Asked Questions",
    seoDescription: "Answers to common questions about treatment, insurance, and appointments at Fresh Start Behavioral Health.",
    blocks: [
      hero("Frequently Asked Questions"),
      {
        type: "faqAccordion",
        heading: "Common questions",
        items: [
          { q: "How do I become a new patient?", a: "Call us at 937-579-0073 or complete the appointment request on our contact page. We’ll schedule an initial assessment and verify your insurance." },
          { q: "Do you offer same-day appointments?", a: "Same-day appointments may be available if you call before 10 AM." },
          { q: "What insurance do you accept?", a: "We accept most major plans and Ohio Medicaid. See our insurance page for the full list." },
          { q: "Do you offer telehealth?", a: "Yes — many appointment types are available via secure telehealth." },
          { q: "Is my information confidential?", a: "Yes. Your care is protected under HIPAA, with additional protections for substance use records under 42 CFR Part 2." },
        ],
      },
    ],
  },
  {
    slug: "resources/forms",
    title: "Patient Forms",
    seoDescription: "Patient forms and registration for Fresh Start Behavioral Health.",
    blocks: [
      hero("Patient Forms", "New and existing patient forms."),
      text("Getting started", "New patients can begin the intake process through our secure intake portal. For questions about which forms you need, contact us at 937-579-0073."),
      cta("Start your intake", "Begin the secure new-patient intake process.", "Start Intake", "/intake"),
    ],
  },
  {
    slug: "resources/downloads",
    title: "Downloads",
    seoDescription: "Downloadable resources from Fresh Start Behavioral Health.",
    blocks: [
      hero("Downloads", "Printable resources and guides."),
      text("Available downloads", "Downloadable forms and guides will be posted here. Check back soon, or contact us if you need a specific document."),
    ],
  },
  {
    slug: "resources/community-resources",
    title: "Community Resources",
    seoDescription: "Local community resources for mental health and recovery in the Dayton, Cincinnati, and Milford areas.",
    blocks: [
      hero("Community Resources", "Local organizations and supports beyond our walls."),
      text("Finding support", "Recovery and wellness are supported by a strong community. We can help connect you with local resources for housing, food, employment, peer support, and more. Contact our case management team to learn more."),
      cta("Need a referral?", "Our case managers can help connect you.", "Contact Us", "/contact"),
    ],
  },
  {
    slug: "resources/crisis-resources",
    title: "Crisis Resources",
    seoDescription: "Crisis and emergency mental health resources.",
    blocks: [
      hero("Crisis Resources", "If you are in crisis, help is available now."),
      text("Immediate help", "988 Suicide & Crisis Lifeline — call or text 988 (24/7).\n\nCrisis Text Line — text HOME to 741741.\n\nFor a life-threatening emergency, call 911 or go to your nearest emergency department."),
      cta("Talk to our team", "We’re here to support you.", "Crisis Support", "/crisis-support"),
    ],
  },
];
