import "server-only";
import { db } from "@/lib/db";
import { classifyRoleAssignment } from "@/lib/roles";

export type AssignResult = { ok: boolean; error?: string };

/** The single write path for assigning a role (built-in or custom) to a user.
 *  Enforces the custom-role Super-Admin gate and validates custom keys against
 *  SystemRole. Used by user management and role-deactivation reassignment. */
export async function applyRoleAssignment(input: {
  userId: string;
  key: string;
  actorIsSuperAdmin: boolean;
}): Promise<AssignResult> {
  const plan = classifyRoleAssignment(input.key, { viewerIsSuperAdmin: input.actorIsSuperAdmin });
  if (plan.kind === "reject") return { ok: false, error: "That role cannot be assigned." };

  if (plan.kind === "builtin") {
    await db.user.update({
      where: { id: input.userId },
      data: { role: plan.role, customRoleKey: null },
    });
    return { ok: true };
  }

  if (plan.kind === "custom") {
    // the role must exist, be active, and not be a built-in/system role.
    const role = await db.systemRole.findUnique({
      where: { key: input.key },
      select: { isActive: true, isSystem: true },
    });
    if (!role || !role.isActive || role.isSystem) return { ok: false, error: "Custom role is unavailable." };
    await db.user.update({
      where: { id: input.userId },
      data: { customRoleKey: input.key }, // keep the existing role enum as a fallback
    });
    return { ok: true };
  }

  // Exhaustive: RoleAssignmentPlan has no other kinds.
  return { ok: false, error: "That role cannot be assigned." };
}
