import { db } from "@/lib/db";
import { requirePatient } from "@/lib/patient-auth";
import { DocumentUpload } from "@/components/portal/DocumentUpload";
import { deleteDocument } from "./actions";

export const dynamic = "force-dynamic";

const scanStyle: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CLEAN: "bg-green-100 text-green-800",
  INFECTED: "bg-red-100 text-red-800",
};

function kb(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const session = await requirePatient();
  const docs = await db.patientDocument.findMany({
    where: { patientId: session.sub, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Documents</h1>
        <p className="text-sm text-ink-soft">
          Securely share documents (insurance cards, records) with your care team. Every upload is
          virus-scanned before it can be opened and is logged in our audit trail.
        </p>
      </div>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="font-semibold text-brand-dark">Upload a document</h2>
        <DocumentUpload />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-brand-dark">Your documents</h2>
        {docs.length === 0 && (
          <p className="rounded-card border border-line bg-white p-5 text-sm text-ink-soft">No documents uploaded yet.</p>
        )}
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-card border border-line bg-white p-4">
              <div>
                <p className="font-medium text-brand-dark">{d.fileName}</p>
                <p className="text-xs text-ink-soft">
                  {kb(d.sizeBytes)} · uploaded {d.uploadedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + (scanStyle[d.scanStatus] ?? "")}>
                  {d.scanStatus === "PENDING" ? "scanning" : d.scanStatus.toLowerCase()}
                </span>
                <form action={deleteDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-sm font-medium text-accent hover:underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
