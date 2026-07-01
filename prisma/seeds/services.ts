// prisma/seeds/services.ts
import { db } from "@/lib/db";

const FRESH_START_SERVICES = [
  { slug: "mental-health", title: "Mental Health Services", excerpt: "Comprehensive mental health treatment including individual therapy, psychiatry, and crisis intervention for adults and children.", iconName: "Brain", sortOrder: 1 },
  { slug: "substance-use-treatment", title: "Substance Use Treatment", excerpt: "Evidence-based substance abuse treatment, detox support, and recovery services in a compassionate, structured environment.", iconName: "HeartHandshake", sortOrder: 2 },
  { slug: "child-psychiatry", title: "Child Psychiatry", excerpt: "Specialist psychiatric assessment and medication management for children and adolescents experiencing mental health challenges.", iconName: "Baby", sortOrder: 3 },
  { slug: "psychiatry", title: "Psychiatry", excerpt: "Adult psychiatric evaluation, diagnosis, and medication management by board-certified psychiatrists.", iconName: "Stethoscope", sortOrder: 4 },
  { slug: "individual-group-therapies", title: "Individual & Group Therapies", excerpt: "One-on-one and group therapy sessions using evidence-based approaches to support recovery and mental wellness.", iconName: "Users", sortOrder: 5 },
  { slug: "family-therapy", title: "Family Therapy", excerpt: "Structured family counselling to rebuild relationships and create a supportive home environment for lasting recovery.", iconName: "Home", sortOrder: 6 },
  { slug: "judicial-services", title: "Judicial Services", excerpt: "Specialised court-ordered treatment programmes and documentation support for individuals in the legal system.", iconName: "Scale", sortOrder: 7 },
  { slug: "primary-care", title: "Primary Care", excerpt: "Integrated primary care services addressing the physical health needs of patients alongside their behavioural health treatment.", iconName: "Activity", sortOrder: 8 },
  { slug: "case-management", title: "Case Management", excerpt: "Personalised case management to coordinate care, connect patients with community resources, and support long-term recovery goals.", iconName: "ClipboardList", sortOrder: 9 },
  { slug: "sober-living-home", title: "Sober Living Home", excerpt: "A structured, alcohol- and drug-free residential environment supporting individuals transitioning from treatment to independent living.", iconName: "Building2", sortOrder: 10 },
  { slug: "crisis-services", title: "Crisis Services", excerpt: "Immediate crisis intervention and stabilisation services available for individuals experiencing acute mental health or substance use emergencies.", iconName: "AlertCircle", sortOrder: 11 },
  { slug: "telehealth", title: "Telehealth", excerpt: "Secure video-based therapy and psychiatric appointments, accessible from home across Ohio.", iconName: "Video", sortOrder: 12 },
  { slug: "medication-management", title: "Medication Management", excerpt: "Ongoing psychiatric medication evaluation, prescription, and monitoring to optimise treatment outcomes.", iconName: "Pill", sortOrder: 13 },
  { slug: "intensive-outpatient", title: "Intensive Outpatient Programme (IOP)", excerpt: "A structured, part-time treatment programme providing intensive therapy while allowing patients to live at home.", iconName: "Calendar", sortOrder: 14 },
];

export async function seedServices() {
  console.log("Seeding services...");
  for (const svc of FRESH_START_SERVICES) {
    await db.service.upsert({
      where: { slug: svc.slug },
      update: { excerpt: svc.excerpt, iconName: svc.iconName, sortOrder: svc.sortOrder, order: svc.sortOrder, isActive: true },
      create: {
        slug: svc.slug,
        title: svc.title,
        excerpt: svc.excerpt,
        iconName: svc.iconName,
        sortOrder: svc.sortOrder,
        isActive: true,
        status: "PUBLISHED",
        order: svc.sortOrder,
      },
    });
  }
  console.log(`Seeded ${FRESH_START_SERVICES.length} services.`);
}
