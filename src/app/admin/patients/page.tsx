import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPatients() {
  await requireCapability("patients:read");
  const patients = await db.patient.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, fhirLinkStatus: true },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">Patients</h1>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">EHR link</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-2">
                  <Link href={`/admin/patients/${p.id}`} className="text-accent hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{p.email}</td>
                <td className="px-4 py-2">{p.fhirLinkStatus ?? "unlinked"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
