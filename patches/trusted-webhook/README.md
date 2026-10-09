# Trusted webhook bots (`RAKAZO_TRUSTED_WEBHOOK_BOTS`)

Self-hosted Rakazo normally forces an owner approval tap on every side-effect tool call in runs started by a webhook (`run.trigger === "webhook"`). This overlay adds a server allowlist:

```bash
RAKAZO_TRUSTED_WEBHOOK_BOTS=<comma-separated bot ids>
```

When a webhook-triggered run’s bot id is listed, the executor skips the forced unattended approval and uses the same path as chat (`user`) or `bot_message` runs: space approval rules, then Auto Review. One info log line is emitted per run when the bypass applies (`botId`, `runId` only).

- Unset or empty: stock behaviour (no change).
- `create_space` still always requires explicit owner approval.
- Per bot id only; no wildcards or space-wide flag.

Inbound messaging routines also use trigger `"webhook"`; listed bots get the same bypass there.

## Trusted `secret_request` POSTs (`RAKAZO_TRUSTED_SECRET_POSTS`)

Auto Review can flag specific outbound `secret_request` calls (for example a webhook pong) even when they are expected. This optional list skips approval and Auto Review for matching calls on **any** run trigger (`user`, `bot_message`, `webhook`).

```bash
RAKAZO_TRUSTED_SECRET_POSTS=<botId>|<credentialName>|<exact URL>,...
```

A call is allowed only when **all** of the following hold:

- Bot id matches exactly.
- Saved credential name (`secret_request` `name`) matches exactly.
- Request URL matches exactly on scheme, host, and path (query and fragment on the request are ignored for matching; no prefix or wildcard).
- HTTP method is `POST`.

Space `require_approval` rules still win. `create_space` is unchanged. Unset or empty means stock behaviour. Each allowed call logs one info line with `botId`, `runId`, and credential name only (never URL, query, or body).

Example (EZ Postmaster pong):

```bash
RAKAZO_TRUSTED_SECRET_POSTS=cmuysyz07007a31pl8jaxorgv|grok_postmaster|https://api2.cursor.sh/automations/webhook/5a8dfae7-13d6-54f3-adb6-4e91088885b4
```

Add the line to `.env` and recreate api/worker like the webhook-bot list above.

## Modified files (Apache-2.0)

This patch modifies upstream Rakazo files from commit `df708491af0e53dec9c4cf9aad1907317db835d0` (image digest `sha256:1cc31cfdc67a5bc78d770ae0320686ce4621daa7588ec6b8a1a1d3138200a6a2`). Upstream is licensed under Apache-2.0; these copies are derivative modifications. Keep Rakazo’s `LICENSE` and treat `action-approval.ts` and `executor.ts` in this folder as patched sources for the overlay image.

## Apply

From your Rakazo install directory (e.g. `~/rakazo`), copy this folder to `patches/trusted-webhook/` and add `docker-compose.trusted-webhook.yml` beside your existing compose files.

```bash
cd ~/rakazo
docker build -t rakazo-app:trusted-webhook-df708491 patches/trusted-webhook
docker run --rm --entrypoint md5sum rakazo-app:trusted-webhook-df708491 \
  /app/packages/core/src/action-approval.ts \
  /app/packages/adapters/src/executor.ts
docker compose -f docker-compose.images.yml -f docker-compose.override.yml -f docker-compose.trusted-webhook.yml up -d api worker
```

Only **api** and **worker** need this image. Supervisor and web stay on your existing images.

## Switch on / change the list

Edit `RAKAZO_TRUSTED_WEBHOOK_BOTS` and/or `RAKAZO_TRUSTED_SECRET_POSTS` in `.env` (back up `.env` first). Both api and worker load `env_file: .env`. Recreate api and worker:

```bash
cd ~/rakazo
docker compose -f docker-compose.images.yml -f docker-compose.override.yml -f docker-compose.trusted-webhook.yml up -d api worker
```

Example (placeholder ids):

```bash
RAKAZO_TRUSTED_WEBHOOK_BOTS=bot-id-one,bot-id-two
```

## Switch off (keep patched image)

Clear or remove `RAKAZO_TRUSTED_WEBHOOK_BOTS` and/or `RAKAZO_TRUSTED_SECRET_POSTS` in `.env`, then run the same `up -d api worker` command above. Behaviour returns to stock gating.

## Rollback to stock image

```bash
cd ~/rakazo
docker compose -f docker-compose.images.yml -f docker-compose.override.yml up -d api worker
```

Always include your usual override file (e.g. `docker-compose.override.yml`) so other services (such as web) keep their pinned images.

Health check after apply or rollback:

```bash
curl -fsS http://127.0.0.1:3100/internal/health
docker logs --since 2m rakazo-worker-1
```

## Re-apply after a Rakazo image update

The overlay pins a **base image digest**. When you upgrade Rakazo:

1. Read the new `org.opencontainers.image.revision` (or `revision` OCI label) on the target `app` image.
2. Re-diff `packages/core/src/action-approval.ts` and `packages/adapters/src/executor.ts` at that revision against this patch (gate logic may have moved in `executor.ts`).
3. Update `FROM ghcr.io/elie222/rakazo/app@sha256:…` in `Dockerfile` to the digest you deploy, refresh the copied `.ts` files, rebuild `rakazo-app:trusted-webhook-<revision-short>`, update `docker-compose.trusted-webhook.yml` image tags, and recreate api/worker.

Do not rely on `docker compose pull` for a moving `edge` tag when reproducing this pin; use the digest you verified.

## Build from this repository

The canonical sources live under `packages/core/src/action-approval.ts` and `packages/adapters/src/executor.ts` on branch `trusted-webhook-bots`. The files in this directory are copies for the Docker build context.
