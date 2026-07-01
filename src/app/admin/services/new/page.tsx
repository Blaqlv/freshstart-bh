import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createService } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await requireCapability("content:write");

  async function handleCreate(fd: FormData) {
    "use server";
    const { id } = await createService(fd);
    redirect(`/admin/services/${id}`);
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">New Service</h1>
      <form action={handleCreate} className="space-y-4 rounded-xl border border-line bg-white p-6">
        <label className="block">
          <span className="block text-xs font-medium text-ink-soft">Title *</span>
          <input
            name="title"
            required
            autoFocus
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-dark"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90"
        >
          Create Service
        </button>
      </form>
    </div>
  );
}
