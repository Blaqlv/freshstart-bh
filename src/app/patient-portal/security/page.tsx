import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { generateSecret, otpauthUrl } from "@/lib/totp";
import { PatientMfaSetup } from "@/components/portal/PatientMfaSetup";
import { disablePatientMfa } from "./actions";

export const dynamic = "force-dynamic";

export default async function PatientSecurityPage() {
  const session = await requirePatient();
  const patient = await db.patient.findUnique({ where: { id: session.sub } });
  if (!patient) return null;

  if (patient.mfaEnabled) {
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
          <form action={disablePatientMfa} className="mt-4">
            <button className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
              Disable &amp; re-enroll
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Ensure a pending secret exists, then render the enrollment QR.
  let secret = patient.mfaSecret;
  if (!secret) {
    secret = generateSecret();
    await db.patient.update({ where: { id: patient.id }, data: { mfaSecret: secret } });
  }
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl(patient.email, secret));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Security</h1>
        <p className="text-sm text-ink-soft">
          Protect your health information with two-factor authentication. We strongly recommend
          enabling it.
        </p>
      </div>
      <div className="rounded-card border border-line bg-white p-6">
        <PatientMfaSetup qrDataUrl={qrDataUrl} secret={secret} />
      </div>
    </div>
  );
}
