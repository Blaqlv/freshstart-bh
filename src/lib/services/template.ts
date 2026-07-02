import { CRISIS_PHONE_HREF } from "@/lib/constants";
import type { Block } from "@/lib/cms/blocks";

type ServiceInput = {
  title: string;
  excerpt: string;
  metaDescription?: string | null;
};

export function buildServicePageBlocks(service: ServiceInput): Block[] {
  return [
    // 0 — Hero
    {
      type: "hero",
      heading: service.title,
      body: service.metaDescription ?? service.excerpt,
      primaryCtaLabel: "Book an Assessment",
      primaryCtaHref: "/intake",
      background: { type: "color", color: "#000068", colorOpacity: 100 },
      textColor: "#ffffff",
      textAlign: "center",
      minHeight: "sm",
    },
    // 1 — What Is [Service]?
    {
      type: "richText",
      heading: `What Is ${service.title}?`,
      body: `<p>Add your description of ${service.title} here. Explain what the service is, who it helps, and why it matters.</p>`,
    },
    // 2 — Benefits (Icon List)
    {
      type: "iconList",
      title: `Benefits of ${service.title}`,
      intro: "",
      columns: 2,
      iconColor: "#000068",
      items: [
        { icon: "CheckCircle2", label: "Benefit one", body: "" },
        { icon: "CheckCircle2", label: "Benefit two", body: "" },
        { icon: "CheckCircle2", label: "Benefit three", body: "" },
        { icon: "CheckCircle2", label: "Benefit four", body: "" },
      ],
    },
    // 3 — Am I a Candidate?
    {
      type: "richText",
      heading: "Am I a Candidate?",
      body: "<p>Describe who is a good fit for this service. Include eligibility criteria, typical patient profile, and any prerequisites.</p>",
    },
    // 4 — What Can I Expect?
    {
      type: "richText",
      heading: "What Can I Expect?",
      body: "<p>Walk the patient through what happens during this service. Describe a typical session, programme structure, or treatment journey.</p>",
    },
    // 5 — FAQs
    {
      type: "faqAccordion",
      heading: `${service.title} FAQs`,
      items: [
        { q: "Frequently asked question 1?", a: "Answer to question 1." },
        { q: "Frequently asked question 2?", a: "Answer to question 2." },
        { q: "Frequently asked question 3?", a: "Answer to question 3." },
      ],
    },
    // 6 — Related Services
    {
      type: "serviceGrid",
      heading: "Related Services",
      slugs: [],
    },
    // 7 — CTA Banner
    {
      type: "ctaBanner",
      heading: "Get In Touch",
      body: "<p>Contact us today to find out if this service is right for you.</p>",
      ctaLabel: "Book an Assessment",
      ctaHref: "/intake",
      buttonVariant: "white",
      secondaryCtaLabel: "Call Us",
      secondaryCtaHref: CRISIS_PHONE_HREF,
      textAlign: "center",
      padding: "lg",
    },
  ];
}
