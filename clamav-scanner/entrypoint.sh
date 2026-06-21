#!/usr/bin/env bash
set -e

mkdir -p /var/lib/clamav
chown -R clamav:clamav /var/lib/clamav || true

# 1. Fetch virus definitions before clamd starts (clamd won't load without a DB).
echo "[entrypoint] updating virus definitions (freshclam)…"
freshclam --stdout || echo "[entrypoint] freshclam failed; continuing if a DB already exists"

# 2. Keep definitions fresh in the background (checks a few times a day).
freshclam --stdout --daemon --checks=8 &

# 3. Start clamd and wait for its TCP socket.
echo "[entrypoint] starting clamd…"
clamd &
for i in $(seq 1 90); do
  if nc -z "${CLAMD_HOST}" "${CLAMD_PORT}" 2>/dev/null; then
    echo "[entrypoint] clamd ready on ${CLAMD_HOST}:${CLAMD_PORT}"
    break
  fi
  sleep 2
done

# 4. Run the HTTP scan service in the foreground (PID 1).
exec node /app/server.mjs
