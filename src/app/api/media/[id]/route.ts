import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Public: stream a CMS media file by id (stored at key `media/<id>`). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await getObject(`media/${id}`);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
