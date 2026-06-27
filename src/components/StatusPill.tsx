import { getSystemStatus, STATUS_META, STATUSPAGE_URL } from "@/lib/statuspage";

/**
 * System status pill (A11). Async server component — reads the live Statuspage
 * indicator (cached 60s) and links out to the status page. Used in the site
 * footer and the patient/admin portal sidebars.
 */
export async function StatusPill({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const level = await getSystemStatus();
  const meta = STATUS_META[level];
  const text = variant === "dark" ? "text-white/85 hover:text-white" : "text-ink-soft hover:text-brand-dark";

  return (
    <a
      href={STATUSPAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-xs ${text} ${className}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
      <span>{meta.label}</span>
    </a>
  );
}
