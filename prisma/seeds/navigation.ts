import { db } from "@/lib/db";
import type { NavPlacement } from "@prisma/client";

type Seed = {
  label: string;
  href?: string;
  placement: NavPlacement;
  sortOrder: number;
  footerColumn?: number;
  parentLabel?: string;
  autoExpandServices?: boolean;
  iconName?: string;
};

const TOP_NAV: Seed[] = [
  { label: "About", sortOrder: 0, placement: "TOP_NAV" },
  { label: "Staff", href: "/providers", sortOrder: 0, placement: "TOP_NAV", parentLabel: "About" },
  { label: "Leadership", href: "/about/leadership", sortOrder: 1, placement: "TOP_NAV", parentLabel: "About" },
  { label: "Careers", href: "/about/careers", sortOrder: 2, placement: "TOP_NAV", parentLabel: "About" },
  { label: "Accreditation", href: "/about/accreditation", sortOrder: 3, placement: "TOP_NAV", parentLabel: "About" },
  { label: "Services", href: "/services", sortOrder: 1, placement: "TOP_NAV", autoExpandServices: true },
  { label: "Insurance", href: "/insurance", sortOrder: 2, placement: "TOP_NAV" },
  { label: "Resources", sortOrder: 3, placement: "TOP_NAV" },
  { label: "Blog", href: "/resources/blog", sortOrder: 0, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "FAQs", href: "/resources/frequently-asked-questions", sortOrder: 1, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "Forms", href: "/resources/forms", sortOrder: 2, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "Downloads", href: "/resources/downloads", sortOrder: 3, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "Community Resources", href: "/resources/community-resources", sortOrder: 4, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "Crisis Resources", href: "/resources/crisis-resources", sortOrder: 5, placement: "TOP_NAV", parentLabel: "Resources" },
  { label: "Locations", href: "/locations", sortOrder: 4, placement: "TOP_NAV" },
  { label: "Contact", href: "/contact", sortOrder: 5, placement: "TOP_NAV" },
];

const FOOTER: Seed[] = [
  { label: "About Us", href: "/about", placement: "FOOTER", sortOrder: 0, footerColumn: 0 },
  { label: "Careers", href: "/about/careers", placement: "FOOTER", sortOrder: 1, footerColumn: 0 },
  { label: "Accreditation", href: "/about/accreditation", placement: "FOOTER", sortOrder: 2, footerColumn: 0 },
  { label: "Patient Reviews", href: "/reviews", placement: "FOOTER", sortOrder: 3, footerColumn: 0 },
  { label: "Mental Health", href: "/services/mental-health", placement: "FOOTER", sortOrder: 0, footerColumn: 1 },
  { label: "Substance Use Treatment", href: "/services/substance-use-treatment", placement: "FOOTER", sortOrder: 1, footerColumn: 1 },
  { label: "Telehealth", href: "/services/telehealth", placement: "FOOTER", sortOrder: 2, footerColumn: 1 },
  { label: "All Services", href: "/services", placement: "FOOTER", sortOrder: 3, footerColumn: 1 },
  { label: "Patient Portal", href: "/patient-portal", placement: "FOOTER", sortOrder: 0, footerColumn: 2 },
  { label: "Insurance", href: "/insurance", placement: "FOOTER", sortOrder: 1, footerColumn: 2 },
  { label: "Resources", href: "/resources", placement: "FOOTER", sortOrder: 2, footerColumn: 2 },
  { label: "Contact", href: "/contact", placement: "FOOTER", sortOrder: 3, footerColumn: 2 },
  { label: "Privacy Policy", href: "/privacy/privacy-policy", placement: "FOOTER", sortOrder: 4, footerColumn: 2 },
];

const UTILITY: Seed[] = [
  { label: "937-579-0073", href: "tel:+19375790073", placement: "UTILITY_BAR", sortOrder: 0, iconName: "Phone" },
  { label: "Book an Assessment", href: "/intake", placement: "UTILITY_BAR", sortOrder: 1, iconName: "Calendar" },
];

export async function seedNavigation() {
  console.log("Seeding navigation...");
  const existing = await db.navigationItem.count();
  if (existing > 0) {
    console.log("Navigation already seeded, skipping.");
    return;
  }

  const parentMap = new Map<string, string>();
  for (const item of TOP_NAV.filter((i) => !i.parentLabel)) {
    const created = await db.navigationItem.create({
      data: {
        label: item.label,
        href: item.href ?? null,
        placement: item.placement,
        sortOrder: item.sortOrder,
        autoExpandServices: item.autoExpandServices ?? false,
      },
    });
    parentMap.set(item.label, created.id);
  }
  for (const item of TOP_NAV.filter((i) => i.parentLabel)) {
    const parentId = item.parentLabel ? (parentMap.get(item.parentLabel) ?? null) : null;
    await db.navigationItem.create({
      data: {
        label: item.label,
        href: item.href ?? null,
        placement: item.placement,
        sortOrder: item.sortOrder,
        parentId,
      },
    });
  }
  for (const item of [...FOOTER, ...UTILITY]) {
    await db.navigationItem.create({
      data: {
        label: item.label,
        href: item.href ?? null,
        placement: item.placement,
        sortOrder: item.sortOrder,
        footerColumn: item.footerColumn ?? null,
        iconName: item.iconName ?? null,
      },
    });
  }
  console.log("Navigation seeded.");
}
