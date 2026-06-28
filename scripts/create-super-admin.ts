// Run ONCE on a fresh deployment: npx tsx scripts/create-super-admin.ts
// Grants Super Admin to an existing user, or creates one with a random temp
// password. The isSuperAdmin flag can ONLY be set here or via direct DB update.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export function generateTempPassword(): string {
  // 30 url-safe chars from 24 random bytes.
  return crypto.randomBytes(24).toString("base64url");
}

async function main() {
  const db = new PrismaClient();
  const rl = createInterface({ input, output });
  try {
    const existingSupers = await db.user.count({ where: { isSuperAdmin: true } });
    if (existingSupers >= 2) {
      console.warn(`WARNING: ${existingSupers} Super Admins already exist. No more than 2 are recommended.`);
      const proceed = (await rl.question("Proceed anyway? (yes/no) ")).trim().toLowerCase();
      if (proceed !== "yes") {
        console.log("Aborted.");
        return;
      }
    }

    const email = (await rl.question("Super Admin email: ")).trim().toLowerCase();
    if (!email || !email.includes("@")) {
      console.error("Invalid email. Aborted.");
      process.exitCode = 1;
      return;
    }

    let user = await db.user.findUnique({ where: { email } });
    let tempPassword: string | null = null;

    if (user) {
      user = await db.user.update({ where: { id: user.id }, data: { isSuperAdmin: true, active: true } });
      console.log(`Granted Super Admin to existing user ${email}.`);
    } else {
      const name = (await rl.question("Full name (new user): ")).trim() || email;
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await db.user.create({
        data: { email, name, passwordHash, role: "ADMINISTRATOR", isSuperAdmin: true, active: true },
      });
      console.log(`Created Super Admin ${email}.`);
      console.log(`TEMP PASSWORD (change immediately): ${tempPassword}`);
    }

    await db.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "system.superadmin.create",
        entity: "User",
        entityId: user.id,
        metadata: { viaScript: true, createdNewUser: tempPassword !== null },
      },
    });
    console.log("Audit entry written. Done.");
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

// Only run main() when executed directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("create-super-admin.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
