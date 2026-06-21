# Fresh Start — ClamAV scan service (Option B)

A self-hosted virus scanner the app calls before storing any uploaded document.
`clamd` does the scanning; a tiny token-gated HTTP service (`server.mjs`, Node
stdlib only) sits in front so there's **no open, unauthenticated clamd port** on
the internet. Document bytes stay inside your trust boundary (BAA-friendly — no
third-party scanner sees PHI). Nothing is persisted by this service.

The app side (`src/lib/scan.ts`) calls `POST $SCAN_API_URL/scan` with
`Authorization: Bearer $SCAN_API_TOKEN`, and **fails closed** — if the scanner is
unreachable or errors, the upload is rejected.

## API
- `GET /healthz` → `200 {"ok":true}` when clamd answers PING, else `503`.
- `POST /scan` (raw bytes, `Authorization: Bearer <token>`) →
  `200 {"clean":true,"engine":"clamav"}` or
  `200 {"clean":false,"engine":"clamav","signature":"..."}`.
  `401` no/!bad token · `413` over `MAX_BYTES` (25MB default).

## Deploy on Fly.io (recommended)
```bash
cd clamav-scanner
fly launch --no-deploy --copy-config --name freshstart-clamav
fly secrets set SCAN_TOKEN=$(openssl rand -hex 32)   # save this value
fly deploy
fly scale memory 2048                                 # clamd needs ~2GB RAM
fly logs                                              # watch for "clamd ready"
```
Then in **Vercel → freshstart-bh → Settings → Environment Variables (Production)**:
```
SCAN_API_URL   = https://freshstart-clamav.fly.dev/scan
SCAN_API_TOKEN = <the SCAN_TOKEN you set>
```
Redeploy the Vercel app. (Fly terminates TLS, so the URL is https.)

## Deploy via docker-compose (VPS / local)
```bash
cd clamav-scanner
export SCAN_TOKEN=$(openssl rand -hex 32)
docker compose up -d
```
This exposes plain HTTP on `:8080` — for the internet, put a TLS proxy
(Caddy/nginx) in front and point `SCAN_API_URL` at the https URL.

## Smoke test
```bash
TOKEN=...; BASE=https://freshstart-clamav.fly.dev
curl -fsS "$BASE/healthz"

# Clean file → {"clean":true,...}
printf 'hello' | curl -s -X POST "$BASE/scan" \
  -H "Authorization: Bearer $TOKEN" --data-binary @- 

# EICAR test file → {"clean":false,"signature":"Eicar-..."}
printf 'X5O!P%%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' \
  | curl -s -X POST "$BASE/scan" -H "Authorization: Bearer $TOKEN" --data-binary @-
```

## Notes
- **Memory:** clamd loads the signature DB into RAM — give it ~2GB.
- **Definitions:** `freshclam` fetches on startup and refreshes in the background.
- **First boot** takes 1–3 min (downloading definitions) — `/healthz` is `503`
  until clamd is ready; that's expected.
- **Security:** constant-time token check, fail-closed, request size cap, no
  persistence. Keep the endpoint on HTTPS and rotate `SCAN_TOKEN` if leaked.
