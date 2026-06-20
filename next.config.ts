import type { NextConfig } from "next";

/**
 * 301 redirects from the old DoctorLogic slugs to the new IA.
 * Source of truth: REDIRECTS.md. Old slugs must keep working indefinitely (SEO).
 */
const legacyRedirects = [
  { source: "/about-us", destination: "/about" },
  { source: "/facilities", destination: "/locations" },
  { source: "/our-team", destination: "/about/leadership" },
  { source: "/leadership-team", destination: "/about/leadership" },
  { source: "/services/outpatient-services/mental-health-dayton-oh", destination: "/services/mental-health" },
  { source: "/services/outpatient-services/substance-abuse-sober-living-dayton-oh", destination: "/services/substance-use-treatment" },
  { source: "/services/outpatient-services/child-psychiatry-dayton-oh", destination: "/services/child-psychiatry" },
  { source: "/services/outpatient-services/individual-group-therapies-dayton-oh", destination: "/services/individual-group-therapies" },
  { source: "/services/outpatient-services/primary-care-dayton-oh", destination: "/services/primary-care" },
  { source: "/services/recovery-services/judicial-services-dayton-oh", destination: "/services/judicial-services" },
  { source: "/services/recovery-services/case-management-dayton-oh", destination: "/services/case-management" },
  { source: "/services/recovery-services/sober-living-home-dayton-oh", destination: "/services/sober-living-home" },
  { source: "/services/recovery-services/crisis-care-dayton-oh", destination: "/services/crisis-services" },
  { source: "/dayton-main-office", destination: "/locations/dayton-main" },
  { source: "/dayton-outpatient-psych-office", destination: "/locations/dayton-outpatient" },
  { source: "/milford-office", destination: "/locations/milford" },
  { source: "/insurance-information", destination: "/insurance" },
  { source: "/patient-resources", destination: "/resources/forms" },
  { source: "/patient-registration", destination: "/intake" },
  { source: "/behavioral-health-blog", destination: "/resources/blog" },
  { source: "/leave-a-review", destination: "/reviews/leave-a-review" },
  { source: "/contact-us", destination: "/contact" },
  { source: "/privacy-policy", destination: "/privacy/privacy-policy" },
  { source: "/schedule-appointment", destination: "/contact#appointment" },
];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map((r) => ({ ...r, permanent: true }));
  },
};

export default nextConfig;
