import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";

/**
 * Token-gated HTTPS-front for clamd (Option B). The app POSTs raw file bytes to
 * POST /scan with `Authorization: Bearer <SCAN_TOKEN>`; we stream them to clamd
 * (INSTREAM) and return JSON { clean, signature, engine }. No file is ever
 * stored here. Run this behind TLS (the platform's HTTPS terminator).
 *
 * Env: SCAN_TOKEN (required), SCAN_PORT (default 8080),
 *      CLAMD_HOST (default 127.0.0.1), CLAMD_PORT (default 3310),
 *      MAX_BYTES (default 26214400 = 25MB).
 */

const PORT = Number(process.env.SCAN_PORT ?? 8080);
const CLAMD_HOST = process.env.CLAMD_HOST ?? "127.0.0.1";
const CLAMD_PORT = Number(process.env.CLAMD_PORT ?? 3310);
const MAX_BYTES = Number(process.env.MAX_BYTES ?? 25 * 1024 * 1024);
const TOKEN = process.env.SCAN_TOKEN;

if (!TOKEN) {
  console.error("FATAL: SCAN_TOKEN is required");
  process.exit(1);
}

function authorized(req) {
  const header = req.headers["authorization"] ?? "";
  const expected = `Bearer ${TOKEN}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function clamdInstream(buf) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
    let response = "";
    socket.setTimeout(20_000);
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
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (d) => (response += d.toString()));
    socket.on("end", () => {
      const r = response.replace(/\0/g, "").trim(); // z-commands NUL-terminate
      if (/\bOK$/.test(r)) resolve({ clean: true, engine: "clamav" });
      else {
        const sig = r.match(/:\s(.+)\sFOUND/)?.[1];
        resolve({ clean: false, engine: "clamav", signature: sig ?? "unknown" });
      }
    });
    socket.on("timeout", () => { socket.destroy(); resolve({ clean: false, engine: "clamav", signature: "scan-timeout" }); });
    socket.on("error", () => resolve({ clean: false, engine: "clamav", signature: "scan-error" }));
  });
}

function clamdPing() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
    let out = "";
    socket.setTimeout(5000);
    socket.on("connect", () => socket.write("zPING\0"));
    socket.on("data", (d) => (out += d.toString()));
    socket.on("end", () => resolve(out.includes("PONG")));
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
    socket.on("error", () => resolve(false));
  });
}

const server = http.createServer((req, res) => {
  const send = (code, obj) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  if (req.method === "GET" && req.url === "/healthz") {
    clamdPing().then((ok) => send(ok ? 200 : 503, { ok }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/scan") return send(404, { error: "not found" });
  if (!authorized(req)) return send(401, { error: "unauthorized" });

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BYTES) {
      aborted = true;
      send(413, { error: "file too large" });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on("end", async () => {
    if (aborted) return;
    if (size === 0) return send(400, { error: "empty body" });
    const result = await clamdInstream(Buffer.concat(chunks));
    send(200, result);
  });
  req.on("error", () => { if (!aborted) send(400, { error: "read error" }); });
});

server.listen(PORT, () => console.log(`scan service listening on :${PORT} (clamd ${CLAMD_HOST}:${CLAMD_PORT})`));
