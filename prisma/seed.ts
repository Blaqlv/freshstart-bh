import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {
  locations as seedLocations,
  testimonials as seedTestimonials,
  homeServiceTiles,
  acceptedInsurance,
} from "../src/lib/site";
import { seedPages } from "./seed-pages";
import { seedSystem } from "./seeds";
import { seedServices } from "./seeds/services";

// Default to the standard engine. Set SEED_DRIVER=neon to seed over Neon's HTTP
// driver instead (useful when the local Prisma query engine can't open a direct
// 5432 connection, e.g. behind a firewall that only allows 443).
const db =
  process.env.SEED_DRIVER === "neon"
    ? new PrismaClient({
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        adapter: new (require("@prisma/adapter-neon").PrismaNeon)({
          connectionString: process.env.DATABASE_URL,
        }),
      })
    : new PrismaClient();

// AES-256-GCM matching src/lib/crypto.ts ("v1:iv:tag:ct"). Inlined because
// crypto.ts is "server-only" and can't be imported into the seed script.
function encField(plaintext: string): string {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set (needed to seed encrypted demo data)");
  const key = raw.length === 64 ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

// Per-service detail copy (description + FAQs) for the /services/[slug] pages.
const SERVICE_DETAILS: Record<string, { description: string; faqs: { q: string; a: string }[] }> = {
  "mental-health": {
    description:
      "Mental health care at Fresh Start is never one-size-fits-all. Our psychiatrists, nurse practitioners, physician assistants, and licensed counselors work together to build a plan around your goals — combining psychiatric care, evidence-based therapy, and ongoing support.\n\nWhether you’re facing a new diagnosis or have struggled for years, we meet you with compassion and a clear path forward.",
    faqs: [
      { q: "What conditions do you treat?", a: "Depression, anxiety, bipolar disorder, PTSD, ADHD, OCD, psychotic disorders, and co-occurring substance use, among others." },
      { q: "Do you prescribe medication?", a: "Yes — our psychiatric providers offer medication management alongside therapy when clinically appropriate." },
    ],
  },
  "substance-use-treatment": {
    description:
      "We provide compassionate, evidence-based treatment for substance use disorders, including medication-assisted treatment, counseling, and recovery support. Care is confidential and protected under federal law (42 CFR Part 2).\n\nOur whole-person approach addresses both addiction and any co-occurring mental health conditions.",
    faqs: [
      { q: "Is treatment confidential?", a: "Yes. Substance use records receive additional federal protection and are not shared without your written consent except as permitted by law." },
      { q: "Do you offer medication-assisted treatment?", a: "Yes, when clinically appropriate, as part of a comprehensive plan." },
    ],
  },
  "crisis-services": {
    description:
      "When you need urgent attention for your mental health, our certified counselors provide crisis care and stabilization. If you are experiencing a life-threatening emergency, call 911 or go to your nearest emergency department.",
    faqs: [
      { q: "What should I do in an emergency?", a: "Call 911 or go to your nearest emergency department. You can also call or text 988 for the Suicide & Crisis Lifeline." },
    ],
  },
};

function serviceDetail(slug: string, fallbackDesc: string | null) {
  const d = SERVICE_DETAILS[slug];
  return {
    description: d?.description ?? fallbackDesc,
    faqs: d?.faqs ?? [
      { q: "How do I get started?", a: "Call us or request an appointment online to schedule an initial assessment." },
      { q: "What insurance do you accept?", a: "Most major plans and Ohio Medicaid. See our insurance page for the full list." },
    ],
    eligibility: [
      "Children, adolescents, and adults are welcome.",
      "Most major insurance and Ohio Medicaid accepted; self-pay available.",
      "Telehealth available for many appointment types.",
    ],
  };
}

const SERVICE_CATALOG: { slug: string; title: string; summary: string }[] = [
  { slug: "mental-health", title: "Mental Health", summary: "Personalized treatment for a wide range of mental health conditions." },
  { slug: "substance-use-treatment", title: "Substance Use Treatment", summary: "Compassionate, evidence-based care for substance use and recovery." },
  { slug: "psychiatry", title: "Psychiatry", summary: "Adult psychiatric evaluation and medication management." },
  { slug: "child-psychiatry", title: "Child Psychiatry", summary: "Specialized psychiatric care for children and adolescents." },
  { slug: "individual-group-therapies", title: "Individual & Group Therapy", summary: "A safe space to talk, process, and heal." },
  { slug: "family-therapy", title: "Family Therapy", summary: "Support for families navigating mental health and recovery together." },
  { slug: "judicial-services", title: "Judicial Services", summary: "Court-coordinated assessment and rehabilitation services." },
  { slug: "primary-care", title: "Primary Care", summary: "Physical and mental health care so you feel better in body and mind." },
  { slug: "case-management", title: "Case Management", summary: "Coordinated support to connect you with the resources you need." },
  { slug: "sober-living-home", title: "Sober Living Home", summary: "Structured, supportive housing for people in recovery." },
  { slug: "crisis-services", title: "Crisis Services", summary: "Urgent mental health support when you need it most." },
  { slug: "telehealth", title: "Telehealth", summary: "Secure virtual visits from the comfort of home." },
  { slug: "medication-management", title: "Medication Management", summary: "Ongoing psychiatric medication monitoring and adjustment." },
  { slug: "intensive-outpatient", title: "Intensive Outpatient (IOP)", summary: "Structured day treatment while you live at home." },
];

const USERS: { email: string; name: string; role: Role }[] = [
  { email: "admin@freshstartbh.test", name: "Site Administrator", role: "ADMINISTRATOR" },
  { email: "clinical@freshstartbh.test", name: "Dr. Clinical Director", role: "CLINICAL_DIRECTOR" },
  { email: "compliance@freshstartbh.test", name: "Compliance Officer", role: "COMPLIANCE_OFFICER" },
  { email: "front-desk@freshstartbh.test", name: "Front Desk", role: "RECEPTIONIST" },
  { email: "provider@freshstartbh.test", name: "Care Provider", role: "PROVIDER" },
  { email: "billing@freshstartbh.test", name: "Billing Staff", role: "BILLING_STAFF" },
];

// SEED_PROFILE=content seeds real content + a single Administrator only (no demo
// per-role staff accounts, no demo patient/intake PHI) — intended for production.
const CONTENT_ONLY = process.env.SEED_PROFILE === "content";

async function main() {
  // v2.3 — the single tenant that exists today (multi-tenant foundation).
  await db.tenant.upsert({
    where: { slug: "fresh-start" },
    update: {},
    create: { slug: "fresh-start", name: "Fresh Start Behavioral Health" },
  });

  const passwordHash = bcrypt.hashSync("ChangeMe123!", 10);
  const usersToSeed = CONTENT_ONLY
    ? [
        {
          email: (process.env.SEED_ADMIN_EMAIL ?? "admin@freshstartbh.test").toLowerCase().trim(),
          name: "Site Administrator",
          role: "ADMINISTRATOR" as Role,
        },
      ]
    : USERS;
  for (const u of usersToSeed) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, active: true },
      create: { ...u, passwordHash },
    });
  }

  for (let i = 0; i < seedLocations.length; i++) {
    const l = seedLocations[i];
    await db.location.upsert({
      where: { slug: l.slug },
      update: { name: l.name, street: l.street, city: l.city, state: l.state, zip: l.zip, phone: l.phone ?? null, blurb: l.blurb, lat: l.lat, lng: l.lng, order: i },
      create: { slug: l.slug, name: l.name, street: l.street, city: l.city, state: l.state, zip: l.zip, phone: l.phone ?? null, blurb: l.blurb, lat: l.lat, lng: l.lng, order: i, status: "PUBLISHED" },
    });
  }

  // Testimonials (idempotent-ish: clear and reinsert)
  await db.testimonial.deleteMany();
  for (let i = 0; i < seedTestimonials.length; i++) {
    const t = seedTestimonials[i];
    await db.testimonial.create({ data: { quote: t.quote, author: t.author, source: t.source, rating: 5, order: i, status: "PUBLISHED" } });
  }

  for (let i = 0; i < SERVICE_CATALOG.length; i++) {
    const s = SERVICE_CATALOG[i];
    const tile = homeServiceTiles.find((h) => h.slug === s.slug);
    const detail = serviceDetail(s.slug, tile?.blurb ?? s.summary);
    await db.service.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        summary: s.summary,
        description: detail.description,
        eligibility: detail.eligibility,
        faqs: detail.faqs,
        order: i,
        status: "PUBLISHED",
      },
      create: {
        slug: s.slug,
        title: s.title,
        summary: s.summary,
        description: detail.description,
        order: i,
        status: "PUBLISHED",
        eligibility: detail.eligibility,
        faqs: detail.faqs,
      },
    });
  }

  const providers = [
    { slug: "irfan-dahar", name: "Irfan Dahar", credentials: "MD", title: "Medical Director", specializations: ["Psychiatry", "Addiction Medicine"] },
    { slug: "ebenezer-aluma", name: "Ebenezer Aluma", credentials: "PhD, PA-C", title: "Executive Director", specializations: ["Behavioral Health", "Primary Care"] },
  ];
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    await db.provider.upsert({
      where: { slug: p.slug },
      update: { name: p.name, credentials: p.credentials, title: p.title, order: i, status: "PUBLISHED", specializations: p.specializations },
      create: { ...p, languages: ["English"], telehealth: true, order: i, status: "PUBLISHED" },
    });
  }

  // A published Home CMS page demonstrating blocks
  const blocks = [
    { type: "hero", heading: "Everyone Deserves a Fresh Start", body: "Personalized mental health, substance use, and psychiatric care across Dayton, Cincinnati, and Milford, OH.", primaryCtaLabel: "Book an Assessment", primaryCtaHref: "/contact#appointment" },
    { type: "serviceGrid", heading: "Helping People Gain Power In Their Life" },
    { type: "testimonialCarousel", heading: "Our Reviews" },
    { type: "locationGrid", heading: "Our Locations" },
    { type: "ctaBanner", heading: "Ready to start your fresh start?", body: "Same-day appointments may be available.", ctaLabel: "Contact Us", ctaHref: "/contact" },
  ];
  const home = await db.page.upsert({
    where: { slug: "home" },
    update: { title: "Home", status: "PUBLISHED", publishedVersion: 1 },
    create: { slug: "home", title: "Home", status: "PUBLISHED", publishedVersion: 1, seoTitle: "Fresh Start Behavioral Health | Dayton & Cincinnati, OH", seoDescription: "Personalized behavioral health care across Ohio." },
  });
  await db.pageVersion.upsert({
    where: { pageId_version: { pageId: home.id, version: 1 } },
    update: { blocks, status: "PUBLISHED" },
    create: { pageId: home.id, version: 1, status: "PUBLISHED", blocks },
  });

  // CMS-managed narrative & legal pages (rendered by the (site)/[...slug] catch-all)
  for (const p of seedPages) {
    const page = await db.page.upsert({
      where: { slug: p.slug },
      update: { title: p.title, status: "PUBLISHED", publishedVersion: 1, seoDescription: p.seoDescription ?? null },
      create: { slug: p.slug, title: p.title, status: "PUBLISHED", publishedVersion: 1, seoDescription: p.seoDescription ?? null },
    });
    await db.pageVersion.upsert({
      where: { pageId_version: { pageId: page.id, version: 1 } },
      update: { blocks: p.blocks as object, status: "PUBLISHED" },
      create: { pageId: page.id, version: 1, status: "PUBLISHED", blocks: p.blocks as object },
    });
  }

  // A couple of blog posts (migrated from /behavioral-health-blog)
  const posts = [
    {
      slug: "understanding-anxiety",
      title: "Understanding Anxiety: When to Seek Help",
      excerpt: "Anxiety is common — but it doesn't have to run your life. Here's how to recognize when it's time to reach out.",
      body: "Anxiety is one of the most common mental health concerns, and it’s very treatable. Many people live with everyday worry, but anxiety becomes a concern when it’s persistent, overwhelming, or interferes with work, relationships, or daily life.\n\nIf you find yourself avoiding situations, struggling to sleep, or feeling on edge most days, it may be time to talk with a professional. Effective treatments — including therapy and, when appropriate, medication — can help you feel like yourself again.\n\nReach out to our team to schedule an assessment. You deserve support.",
    },
    {
      slug: "supporting-a-loved-one-in-recovery",
      title: "Supporting a Loved One in Recovery",
      excerpt: "Recovery is a journey, and families play a vital role. Here are practical ways to offer meaningful support.",
      body: "When someone you love is in recovery from substance use, your support can make a real difference. Start by learning about addiction as a health condition — not a moral failing.\n\nSet healthy boundaries, celebrate small wins, and take care of your own wellbeing too. Family therapy and peer support groups can help everyone heal.\n\nOur case management and family therapy teams are here to help your whole family move forward.",
    },
  ];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    await db.blogPost.upsert({
      where: { slug: p.slug },
      update: { title: p.title, excerpt: p.excerpt, body: p.body, status: "PUBLISHED" },
      create: { ...p, status: "PUBLISHED", publishedAt: new Date(Date.now() - i * 86400000) },
    });
  }

  const forms = [
    { key: "appointment-request", name: "Appointment Request" },
    { key: "insurance-verification", name: "Insurance Verification" },
    { key: "intake", name: "New Patient Intake" },
    { key: "document-upload", name: "Secure Document Upload" },
  ];
  for (const f of forms) {
    await db.formDefinition.upsert({ where: { key: f.key }, update: { name: f.name }, create: { ...f, schema: [] } });
  }

  // --- Patient Portal demo data (skipped for SEED_PROFILE=content) ---------
  // crypto.ts can't be imported here (it's "server-only"); inline the same
  // AES-256-GCM "v1:iv:tag:ct" format so values are decryptable by the app.
  if (!CONTENT_ONLY) {
  const demoEmail = "patient@freshstartbh.test";
  const demoPatient = await db.patient.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, name: "Jordan Rivers", passwordHash },
  });
  // Reset demo records so re-seeding is idempotent.
  await db.appointment.deleteMany({ where: { patientId: demoPatient.id } });
  await db.messageThread.deleteMany({ where: { patientId: demoPatient.id } });
  await db.refillRequest.deleteMany({ where: { patientId: demoPatient.id } });
  await db.billingStatement.deleteMany({ where: { patientId: demoPatient.id } });

  const day = (n: number) => new Date(Date.now() + n * 86400000);
  const daytonMain = await db.location.findFirst({ where: { city: "Dayton" } });
  await db.appointment.create({
    data: {
      patientId: demoPatient.id,
      locationId: daytonMain?.id ?? null,
      locationName: daytonMain?.name ?? null,
      serviceSlug: "psychiatry",
      serviceName: "Psychiatry",
      scheduledAt: day(5),
      status: "CONFIRMED",
      reasonEncrypted: encField("Medication check-in"),
    },
  });
  await db.messageThread.create({
    data: {
      patientId: demoPatient.id,
      subject: "Welcome to your portal",
      messages: {
        create: {
          sender: "STAFF",
          senderName: "Care Team",
          bodyEncrypted: encField(
            "Welcome to the Fresh Start patient portal! You can message us here anytime. For emergencies, call 911 or 988.",
          ),
        },
      },
    },
  });
  await db.refillRequest.create({
    data: {
      patientId: demoPatient.id,
      medicationEncrypted: encField("Sertraline 50mg"),
      pharmacyEncrypted: encField("Main St Pharmacy, Dayton"),
      status: "IN_REVIEW",
    },
  });
  await db.billingStatement.create({
    data: {
      patientId: demoPatient.id,
      periodLabel: "May 2026 visit",
      amountCents: 4500,
      status: "DUE",
      dueAt: day(20),
      detailEncrypted: encField("Office visit copay — $45.00"),
    },
  });
  } // end !CONTENT_ONLY

  // v2.2 — seed insurance payers from the accepted-insurance list (idempotent).
  // Placeholder payer codes (slug of the name) — staff edit them in /admin/settings/payers.
  for (const name of acceptedInsurance) {
    const existing = await db.insurancePayer.findFirst({ where: { name } });
    if (!existing) {
      await db.insurancePayer.create({
        data: {
          name,
          payerCode: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40),
        },
      });
    }
  }

  // v3 Super Admin — module/role/permission registry.
  await seedSystem(db);

  // Task 2 — enrich services with excerpt, iconName, sortOrder, isActive.
  await seedServices();

  console.log("Seed complete" + (CONTENT_ONLY ? " (content-only profile):" : ":"));
  console.log(`  users:        ${CONTENT_ONLY ? 1 : USERS.length}${CONTENT_ONLY ? " (Administrator only)" : ""}`);
  console.log(`  locations:    ${seedLocations.length}`);
  console.log(`  testimonials: ${seedTestimonials.length}`);
  console.log(`  services:     ${SERVICE_CATALOG.length}`);
  console.log(`  providers:    ${providers.length}`);
  console.log(`  pages:        ${seedPages.length + 1} (home + narrative/legal, published)`);
  console.log(`  blog posts:   ${posts.length}`);
  console.log(`  forms:        ${forms.length}`);
  if (!CONTENT_ONLY) console.log(`  patient:      1 (demo)`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
