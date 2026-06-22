import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { putObject } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Raster images only. SVG is excluded: it can carry scripts and would be an XSS
// vector when served same-origin. If SVG is needed later, sanitize before storing.
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "content:write")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const width = Number(form.get("width")) || null; // client-computed dimensions
  const height = Number(form.get("height")) || null;
  const alt = file.name.replace(/\.[^.]+$/, ""); // filename doubles as the library label
  const buf = Buffer.from(await file.arrayBuffer());

  const media = await db.media.create({
    data: {
      url: "",
      alt,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      uploadedById: session.sub,
    },
  });
  await putObject(`media/${media.id}`, buf, file.type);
  const updated = await db.media.update({
    where: { id: media.id },
    data: { url: `/api/media/${media.id}` },
  });

  await audit({ sub: session.sub, email: session.email }, "media.upload", "Media", media.id, {
    mimeType: file.type,
    sizeBytes: file.size,
  });

  return NextResponse.json({
    id: updated.id,
    url: updated.url,
    alt: updated.alt,
    mimeType: updated.mimeType,
    width: updated.width,
    height: updated.height,
    sizeBytes: updated.sizeBytes,
  });
}
