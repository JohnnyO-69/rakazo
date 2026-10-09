FROM ghcr.io/elie222/rakazo/app@sha256:1cc31cfdc67a5bc78d770ae0320686ce4621daa7588ec6b8a1a1d3138200a6a2
COPY --chmod=0644 action-approval.ts /app/packages/core/src/action-approval.ts
COPY --chmod=0644 executor.ts        /app/packages/adapters/src/executor.ts
LABEL org.opencontainers.image.title="rakazo-trusted-webhook" \
      org.opencontainers.image.base.revision="df708491af0e53dec9c4cf9aad1907317db835d0" \
      ezapps365.patch="RAKAZO_TRUSTED_WEBHOOK_BOTS allowlist, 2026-10-09"
