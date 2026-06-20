import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  locations as seedLocations,
  testimonials as seedTestimonials,
  homeServiceTiles,
} from "../src/lib/site";

const db = new PrismaClient();

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

async function main() {
  const passwordHash = bcrypt.hashSync("ChangeMe123!", 10);
  for (const u of USERS) {
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
    await db.service.upsert({
      where: { slug: s.slug },
      update: { title: s.title, summary: s.summary, order: i, status: "PUBLISHED" },
      create: {
        slug: s.slug,
        title: s.title,
        summary: s.summary,
        description: tile?.blurb ?? null,
        order: i,
        status: "PUBLISHED",
        eligibility: ["Children, adolescents, and adults welcome.", "Most major insurance and Ohio Medicaid accepted."],
        faqs: [{ q: "How do I get started?", a: "Call us or request an appointment online to schedule an initial assessment." }],
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

  const forms = [
    { key: "appointment-request", name: "Appointment Request" },
    { key: "insurance-verification", name: "Insurance Verification" },
    { key: "intake", name: "New Patient Intake" },
    { key: "document-upload", name: "Secure Document Upload" },
  ];
  for (const f of forms) {
    await db.formDefinition.upsert({ where: { key: f.key }, update: { name: f.name }, create: { ...f, schema: [] } });
  }

  console.log("Seed complete:");
  console.log(`  users:        ${USERS.length} (login: admin@freshstartbh.test / ChangeMe123!)`);
  console.log(`  locations:    ${seedLocations.length}`);
  console.log(`  testimonials: ${seedTestimonials.length}`);
  console.log(`  services:     ${SERVICE_CATALOG.length}`);
  console.log(`  providers:    ${providers.length}`);
  console.log("  pages:        1 (home, published)");
  console.log(`  forms:        ${forms.length}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
