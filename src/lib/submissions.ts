import type { Role } from "@prisma/client";
import { can } from "@/lib/rbac";

/**
 * Which form types a role may view. Receptionist sees appointment requests;
 * Billing sees insurance verification; Admin sees all (has both capabilities).
 */
export function allowedFormKeys(role: Role): string[] {
  const keys: string[] = [];
  if (can(role, "appointments:read")) keys.push("appointment-request");
  if (can(role, "billing:manage")) keys.push("insurance-verification");
  return keys;
}

export const formKeyLabels: Record<string, string> = {
  "appointment-request": "Appointment request",
  "insurance-verification": "Insurance verification",
};
