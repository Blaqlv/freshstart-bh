// TEMPORARY DIAGNOSTIC — remove after debugging the ERR_REQUIRE_ESM on CMS pages.
// Returns the full error (which the Vercel log UI truncates) plus the Node version
// the lambda actually runs, by exercising the exact sanitize path the pages use.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const info: Record<string, unknown> = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
  try {
    const mod = await import("@/lib/sanitize");
    info.sanitizeResult = mod.sanitizeHtml("<b>hi</b><script>alert(1)</script>");
    info.ok = true;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    info.ok = false;
    info.errName = err?.name;
    info.errCode = err?.code;
    info.errMessage = err?.message;
    info.errStack = String(err?.stack ?? "").split("\n").slice(0, 16);
  }
  return Response.json(info);
}
