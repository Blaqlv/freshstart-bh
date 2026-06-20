import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Object storage for uploaded documents. Uses Cloudflare R2 (S3-compatible) in
 * production when R2_* env vars are set; otherwise falls back to an on-disk
 * store under `.uploads/` for local dev. Either way the bytes handed here are
 * already AES-256 encrypted at the app layer (see crypto.encryptBuffer), so the
 * fallback never writes plaintext PHI.
 */

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

export function storageBackend(): "r2" | "local" {
  return isR2Configured() ? "r2" : "local";
}

// --- R2 (S3-compatible) -----------------------------------------------------

async function r2Client() {
  // Imported lazily so the dependency only loads when R2 is actually used.
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Local fallback ---------------------------------------------------------

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");
function localPath(key: string) {
  // Keys are app-generated (owner/id); guard against traversal anyway.
  const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(LOCAL_ROOT, safe);
}

// --- Public API -------------------------------------------------------------

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (isR2Configured()) {
    const client = await r2Client();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(
      new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, Body: body, ContentType: contentType }),
    );
    return;
  }
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function getObject(key: string): Promise<Buffer | null> {
  if (isR2Configured()) {
    const client = await r2Client();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }
  try {
    return await fs.readFile(localPath(key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (isR2Configured()) {
    const client = await r2Client();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
    return;
  }
  try {
    await fs.unlink(localPath(key));
  } catch {
    /* already gone */
  }
}
