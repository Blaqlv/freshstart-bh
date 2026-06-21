# Single-container clamd + token-gated HTTP scan service (Option B).
# Self-hosted so document bytes never leave your trust boundary (BAA-friendly).
FROM node:20-bookworm-slim

# clamav daemon + freshclam (definition updater) + netcat for the readiness probe.
RUN apt-get update \
 && apt-get install -y --no-install-recommends clamav clamav-daemon clamav-freshclam netcat-openbsd ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Make clamd listen on local TCP 3310 (the scan service connects over localhost).
# Append the directives explicitly — Debian's default clamd.conf ships only a
# LocalSocket, so a sed-replace of a non-existent TCPSocket line would be a no-op.
RUN sed -i 's|^LocalSocket |#LocalSocket |' /etc/clamav/clamd.conf \
 && printf '\nTCPSocket 3310\nTCPAddr 127.0.0.1\nStreamMaxLength 64M\n' >> /etc/clamav/clamd.conf \
 && sed -i 's|^NotifyClamd|#NotifyClamd|' /etc/clamav/freshclam.conf || true

WORKDIR /app
COPY server.mjs /app/server.mjs
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV SCAN_PORT=8080 CLAMD_HOST=127.0.0.1 CLAMD_PORT=3310
EXPOSE 8080

# clamd needs ~1.5–2GB RAM (the signature DB is loaded into memory).
ENTRYPOINT ["/entrypoint.sh"]
