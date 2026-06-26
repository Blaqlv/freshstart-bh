import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "white";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  // brand-dark passes WCAG AA for white text; teal is reserved for decoration
  primary: "bg-brand-dark text-white hover:bg-brand-hover",
  secondary:
    "border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white",
  // transparent fill with a current-colour border — reads on dark backgrounds
  outline: "border-2 border-current text-current hover:bg-white/10",
  white: "bg-white text-brand-dark hover:bg-brand-tint",
};

export function Button({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  );
}
