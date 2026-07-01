import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { createNavItem } from "../actions";
import type { NavPlacement } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewNavItemPage() {
  await requireCapability("content:write");

  async function handleCreate(formData: FormData) {
    "use server";
    const label = formData.get("label") as string;
    const href = (formData.get("href") as string) || undefined;
    const placement = formData.get("placement") as NavPlacement;
    const target = formData.get("newTab") === "on" ? "_blank" : "_self";
    await createNavItem({ label, href, placement, target });
    redirect("/admin/navigation");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Add Navigation Item</h1>
        <p className="text-sm text-ink-soft">Create a new top-level navigation link.</p>
      </div>

      <form action={handleCreate} className="space-y-4 rounded-xl border border-line bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="label" className="text-sm font-medium text-ink">Label <span className="text-red-500">*</span></label>
          <input id="label" name="label" required className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-dark" />
        </div>
        <div className="space-y-1">
          <label htmlFor="href" className="text-sm font-medium text-ink">URL</label>
          <input id="href" name="href" type="text" placeholder="/example" className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-dark" />
        </div>
        <div className="space-y-1">
          <label htmlFor="placement" className="text-sm font-medium text-ink">Placement <span className="text-red-500">*</span></label>
          <select id="placement" name="placement" required className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-dark">
            <option value="TOP_NAV">Top Navigation</option>
            <option value="FOOTER">Footer</option>
            <option value="UTILITY_BAR">Utility Bar</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="newTab" className="rounded" />
          Open in new tab
        </label>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark/90">
            Create Item
          </button>
          <a href="/admin/navigation" className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-neutral-50">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
