import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { generateSecret, otpauthUrl } from "@/lib/totp";
import { MfaSetup } from "@/components/admin/MfaSetup";
import { disableMfa } from "./actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await requireSession();
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user) return null;

  if (user.mfaEnabled) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-brand-dark">Security</h1>
        <div className="rounded-card border border-line bg-white p-6">
          <h2 className="font-semibold text-brand-dark">Two-factor authentication</h2>
          <p className="mt-1 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Enabled
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            You&rsquo;ll be asked for an authenticator code each time you sign in.
          </p>
          <form action={disableMfa} className="mt-4">
            <button className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
              Disable & re-enroll
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Ensure a pending secret exists, then render the enrollment QR.
  let secret = user.mfaSecret;
  if (!secret) {
    secret = generateSecret();
    await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
  }
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl(user.email, secret));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Security</h1>
        <p className="text-sm text-ink-soft">
          Set up two-factor authentication to protect your account. Required for portal access.
        </p>
      </div>
      <div className="rounded-card border border-line bg-white p-6">
        <MfaSetup qrDataUrl={qrDataUrl} secret={secret} />
      </div>
    </div>
  );
}
