import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCapability, requireModule } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { deleteProvider, updateProvider } from "../actions";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm";
const labelCls = "text-xs font-medium text-ink-soft";

export default async function ProviderEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("provider_profiles");
  const session = await requireCapability("content:read");
  const { id } = await params;
  const p = await db.provider.findUnique({ where: { id } });
  if (!p) notFound();
  const canWrite = can(session.role, "providers:write");
  const disabled = !canWrite;

  return (
    <div className="space-y-6">
      <Link href="/admin/providers" className="text-sm text-brand-dark hover:underline">← All providers</Link>
      <h1 className="text-2xl font-bold text-brand-dark">Edit provider</h1>

      <form action={updateProvider} className="max-w-2xl space-y-4">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={labelCls}>Name</span>
            <input name="name" defaultValue={p.name} disabled={disabled} className={input} /></label>
          <label className="block"><span className={labelCls}>Credentials</span>
            <input name="credentials" defaultValue={p.credentials ?? ""} placeholder="MD, PhD, PA-C" disabled={disabled} className={input} /></label>
          <label className="block sm:col-span-2"><span className={labelCls}>Title</span>
            <input name="title" defaultValue={p.title ?? ""} placeholder="Medical Director" disabled={disabled} className={input} /></label>
          <label className="block sm:col-span-2"><span className={labelCls}>Bio</span>
            <textarea name="bio" defaultValue={p.bio ?? ""} rows={4} disabled={disabled} className={input} /></label>
          <label className="block"><span className={labelCls}>Specializations (comma-separated)</span>
            <input name="specializations" defaultValue={p.specializations.join(", ")} disabled={disabled} className={input} /></label>
          <label className="block"><span className={labelCls}>Languages (comma-separated)</span>
            <input name="languages" defaultValue={p.languages.join(", ")} disabled={disabled} className={input} /></label>
          <label className="block"><span className={labelCls}>Availability</span>
            <input name="availability" defaultValue={p.availability ?? ""} placeholder="Accepting new patients" disabled={disabled} className={input} /></label>
          <label className="block"><span className={labelCls}>Headshot URL</span>
            <input name="headshotUrl" defaultValue={p.headshotUrl ?? ""} disabled={disabled} className={input} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="telehealth" defaultChecked={p.telehealth} disabled={disabled} /> Offers telehealth
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked={p.status === "PUBLISHED"} disabled={disabled} /> Published
          </label>
        </div>
        {canWrite && (
          <button className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
            Save provider
          </button>
        )}
      </form>

      {canWrite && (
        <form action={deleteProvider} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={p.id} />
          <button className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
            Delete provider
          </button>
        </form>
      )}
    </div>
  );
}
