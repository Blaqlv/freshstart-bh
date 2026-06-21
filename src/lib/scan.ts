import "server-only";
import net from "node:net";

/**
 * Virus scanning, run BEFORE anything is written to storage (per the brief).
 *
 * Resolution order:
 *   1. SCAN_API_URL + SCAN_API_TOKEN  → POST bytes to a token-gated HTTPS scan
 *      service (Option B; clamd behind an authenticated wrapper). Preferred.
 *   2. CLAMAV_HOST [+ CLAMAV_PORT]    → stream straight to clamd over TCP.
 *   3. neither                        → detect the EICAR test signature only
 *      (so the infected→reject path stays real); pass everything else.
 *
 * Scanner failures FAIL CLOSED (treated as unsafe). Wire option 1 or 2 before
 * accepting real PHI.
 */

export type ScanResult = { clean: boolean; engine: string; signature?: string };

// The official antivirus test string (harmless; triggers AV engines).
const EICAR =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export async function scanBuffer(buf: Buffer): Promise<ScanResult> {
  if (process.env.SCAN_API_URL && process.env.SCAN_API_TOKEN) {
    return scanWithHttp(buf, process.env.SCAN_API_URL, process.env.SCAN_API_TOKEN);
  }
  const host = process.env.CLAMAV_HOST;
  if (host) {
    return scanWithClamd(buf, host, Number(process.env.CLAMAV_PORT ?? 3310));
  }
  if (buf.includes(Buffer.from(EICAR))) {
    return { clean: false, engine: "heuristic", signature: "Eicar-Test-Signature" };
  }
  return { clean: true, engine: "none (no scanner configured)" };
}

async function scanWithHttp(buf: Buffer, url: string, token: string): Promise<ScanResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: new Uint8Array(buf),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { clean: false, engine: "clamav-http", signature: `http-${res.status}` };
    }
    const json = (await res.json()) as { clean?: boolean; signature?: string };
    return { clean: json.clean === true, engine: "clamav-http", signature: json.signature };
  } catch {
    // Fail closed: scanner unreachable → don't accept the file.
    return { clean: false, engine: "clamav-http", signature: "scan-error" };
  } finally {
    clearTimeout(timer);
  }
}

function scanWithClamd(buf: Buffer, host: string, port: number): Promise<ScanResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let response = "";
    socket.setTimeout(15_000);

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const CHUNK = 64 * 1024;
      for (let i = 0; i < buf.length; i += CHUNK) {
        const slice = buf.subarray(i, i + CHUNK);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(slice.length, 0);
        socket.write(size);
        socket.write(slice);
      }
      socket.write(Buffer.alloc(4)); // 0x00000000 ends the stream
    });
    socket.on("data", (d) => (response += d.toString()));
    socket.on("end", () => {
      const r = response.trim();
      if (/\bOK$/.test(r)) resolve({ clean: true, engine: "clamav" });
      else {
        const sig = r.match(/:\s(.+)\sFOUND/)?.[1];
        resolve({ clean: false, engine: "clamav", signature: sig ?? "unknown" });
      }
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ clean: false, engine: "clamav", signature: "scan-timeout" });
    });
    socket.on("error", () => resolve({ clean: false, engine: "clamav", signature: "scan-error" }));
  });
}
