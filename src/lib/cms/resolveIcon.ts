import * as icons from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Resolve a Lucide icon by its export name (e.g. "CheckCircle2").
 * Falls back to `Circle` for unknown or empty names so render never crashes.
 */
export function resolveIcon(name: string): IconComponent {
  const map = icons as unknown as Record<string, IconComponent>;
  return map[name] ?? icons.Circle;
}
