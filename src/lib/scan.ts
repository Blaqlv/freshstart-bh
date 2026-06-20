import "server-only";
import net from "node:net";

/**
 * Virus scanning, run BEFORE anything is written to storage (per the brief).
 *
 * Production: set CLAMAV_HOST/CLAMAV_PORT to a clamd instance and uploads are
 * streamed to it (INSTREAM). Without clamd configured we still detect the
 * standard EICAR test signature — so the "infected → rejected" path is real and
 * testable — and otherwise pass the file. Wire clamd before accepting real PHI.
 */

export type ScanResult = { clean: boolean; engine: string; signature?: string };

// The official antivirus test string (harmless; triggers AV engines).
const EICAR =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export async function scanBuffer(buf: Buffer): Promise<ScanResult> {
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  if (host) {
    return scanWithClamd(buf, host, port);
  }
  // Heuristic fallback.
  if (buf.includes(Buffer.from(EICAR))) {
    return { clean: false, engine: "heuristic", signature: "Eicar-Test-Signature" };
  }
  return { clean: true, engine: "none (clamd not configured)" };
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
      const terminator = Buffer.alloc(4); // 0x00000000 ends the stream
      socket.write(terminator);
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
      // Fail closed: if the scanner can't be reached, don't accept the file.
      resolve({ clean: false, engine: "clamav", signature: "scan-timeout" });
    });
    socket.on("error", () => resolve({ clean: false, engine: "clamav", signature: "scan-error" }));
  });
}
