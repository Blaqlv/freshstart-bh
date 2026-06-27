/**
 * JSON-LD schema builders (A3).
 *
 * Every value is pulled from the CMS / database or the site config — never
 * hard-coded here — so structured data stays in sync with page content. Phone,
 * address, and ratings live in one place (lib/site.ts + DB) and flow through.
 */
import { site, locations as seedLocations } from "@/lib/site";
import type { Location, Provider, Service, BlogPost } from "@prisma/client";

const base = () => site.url.replace(/\/$/, "");

type Hours = { day: string; opens: string; closes: string };

function openingHoursSpec(hours: unknown) {
  if (!Array.isArray(hours)) return undefined;
  return (hours as Hours[])
    .filter((h) => h?.day && h?.opens && h?.closes)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.opens,
      closes: h.closes,
    }));
}

/** MedicalOrganization + LocalBusiness for the homepage / org-wide pages. */
export function organizationSchema() {
  const main = seedLocations[0];
  return {
    "@context": "https://schema.org",
    "@type": ["MedicalOrganization", "LocalBusiness"],
    name: site.name,
    url: base(),
    logo: `${base()}/icon.png`,
    telephone: site.phone,
    address: main
      ? {
          "@type": "PostalAddress",
          streetAddress: main.street,
          addressLocality: main.city,
          addressRegion: main.state,
          postalCode: main.zip,
          addressCountry: "US",
        }
      : undefined,
    hasMap: site.google,
    sameAs: [site.facebook, site.google].filter(Boolean),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: site.rating.value,
      reviewCount: site.rating.count,
    },
  };
}

/** MedicalClinic for a single location page. */
export function locationSchema(loc: Location) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: loc.name,
    url: `${base()}/locations/${loc.slug}`,
    telephone: loc.phone ?? site.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: loc.street,
      addressLocality: loc.city,
      addressRegion: loc.state,
      postalCode: loc.zip,
      addressCountry: "US",
    },
    geo:
      loc.lat != null && loc.lng != null
        ? { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng }
        : undefined,
    openingHoursSpecification: openingHoursSpec(loc.hours),
  };
}

/** Physician for a provider profile page. */
export function providerSchema(p: Provider) {
  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: `${p.name}${p.credentials ? `, ${p.credentials}` : ""}`,
    url: `${base()}/providers/${p.slug}`,
    image: p.headshotUrl ?? undefined,
    medicalSpecialty: p.specializations.length ? p.specializations : undefined,
    knowsLanguage: p.languages.length ? p.languages : undefined,
    worksFor: { "@type": "MedicalOrganization", name: site.name, url: base() },
  };
}

/** MedicalWebPage + MedicalCondition + FAQPage for a service page. */
export function serviceSchema(s: Service) {
  const faqs = Array.isArray(s.faqs) ? (s.faqs as { q: string; a: string }[]) : [];
  const graph: Record<string, unknown>[] = [
    {
      "@type": "MedicalWebPage",
      name: s.title,
      url: `${base()}/services/${s.slug}`,
      description: s.summary ?? undefined,
      about: { "@type": "MedicalCondition", name: s.title },
    },
  ];
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs
        .filter((f) => f?.q && f?.a)
        .map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** BlogPosting for a blog article. */
export function blogPostingSchema(post: BlogPost & { author?: { name: string } | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ?? undefined,
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author?.name
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: site.name },
    publisher: { "@type": "Organization", name: site.name, url: base() },
    url: `${base()}/resources/blog/${post.slug}`,
  };
}

/** AggregateRating for the reviews page (values come from the CMS via site config). */
export function aggregateRatingSchema(value: number, count: number) {
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: { "@type": "MedicalOrganization", name: site.name, url: base() },
    ratingValue: value,
    reviewCount: count,
    bestRating: 5,
  };
}
