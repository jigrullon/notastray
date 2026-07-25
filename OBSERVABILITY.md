# Observability

Three layers, per `specs/observability-platform.md`:

1. **Sentry** (hosted SaaS, free tier) — exception tracking, stack traces, source maps.
2. **Self-hosted Grafana + Loki** — structured request/error logs, the Ops (SRE) dashboard.
3. **Grafana + internal metrics API** — business/marketing dashboard sourced from Firestore.

All three phases are built: the plumbing (logger, route wrapper, Sentry config), the self-hosted Grafana/Loki stack, every API route instrumented, UTM/attribution capture, Rescue Crew engagement events, Sentry user-ID linkage, the internal metrics API + daily rollup, and both Grafana dashboards + a 5xx alert rule.

## What runs where

| Piece | Where | Cost |
|---|---|---|
| Next.js app | Vercel | existing |
| Sentry | Sentry's hosted SaaS | free tier |
| Grafana + Loki + Caddy | a small always-on box you provision (VPS / container host) | ~$4–6/mo, or $0 on a sufficient free tier |

Vercel and the Grafana/Loki box are two separate deployments — the app pushes logs to the box over the internet; nothing about this box is part of the Vercel deploy.

## Environment variables

Set these in the **Vercel project's** environment variables (not in this repo):

| Var | Purpose |
|---|---|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry project DSN (server / client) |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Build-time source map upload. Leave unset locally — the build skips upload rather than failing (see `next.config.js`). |
| `LOKI_PUSH_URL` | Base URL of the self-hosted Loki instance, e.g. `https://logs.notastray.com`. Leave unset to disable log shipping — routes still log to stdout via `console.*`, so nothing breaks, you just lose the Grafana view. |
| `LOKI_PUSH_USERNAME` / `LOKI_PUSH_PASSWORD` | Basic auth credentials for the Caddy proxy in front of Loki. |
| `INTERNAL_METRICS_API_KEY` | Shared secret for `/api/internal/*` routes — must exactly match the same-named var in `observability/.env` (Grafana's Infinity datasource sends it as `X-Internal-Metrics-Key`). |
| `CRON_SECRET` | Auto-provisioned by Vercel once Cron Jobs are enabled for the project — you don't generate this yourself. Vercel sends it automatically as `Authorization: Bearer <value>` on the daily rollup cron invocation. |

See `.env.local.example` for the full list with inline comments.

## Standing up the Grafana/Loki box

1. Provision a small always-on host (a $4–6/mo VPS is enough at current scale; Fly.io's free allowance also works). Docker + Docker Compose need to be installed on it.
2. Point DNS A records for two subdomains at the box — one for Loki's push endpoint, one for the Grafana UI (e.g. `logs.notastray.com`, `grafana.notastray.com`). Caddy needs both to issue TLS certs.
3. Copy `observability/.env.example` to `observability/.env` on the box and fill in real values:
   - `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` — Grafana's own login.
   - `LOKI_PUBLIC_DOMAIN` / `GRAFANA_PUBLIC_DOMAIN` — the two domains from step 2.
   - `LOKI_PUSH_USERNAME` — must match `LOKI_PUSH_USERNAME` set in Vercel.
   - `LOKI_PUSH_PASSWORD_HASH` — a **bcrypt hash**, not the raw password. Generate it with:
     ```
     docker run --rm caddy:2.9-alpine caddy hash-password --plaintext '<the real password>'
     ```
     The raw password (not the hash) is what goes into Vercel's `LOKI_PUSH_PASSWORD`.
     **You must double every `$` in the hash to `$$` when you paste it into `.env`** — confirmed by testing: Docker Compose reinterprets a literal `$` in any `.env` value as the start of another variable reference and silently drops whatever follows it, corrupting the hash. A hash like `$2a$14$U6XI...` goes into `.env` as `$$2a$$14$$U6XI...`. Sanity-check with `docker compose config` before deploying — it should echo the hash back with single `$` and print no "variable is not set" warnings.
   - `INTERNAL_METRICS_API_KEY` — must be the **exact same value** as `INTERNAL_METRICS_API_KEY` in the app's Vercel env vars (generate one with `openssl rand -hex 32`, then set it in both places).
   - `APP_BASE_URL` — your deployed app's origin (e.g. `https://notastray.com`, no trailing slash). Locks the Infinity datasource to only ever query that one host — Infinity blocks every URL by default otherwise (confirmed by testing: every Business & Growth panel 403s with "requested URL not allowed" without this). **Must match** the `app_url` variable you set inside the dashboard after import (step 7) — a mismatch reproduces the same 403.
   - `ALERT_WEBHOOK_URL` — a Slack "Incoming Webhook" or Discord webhook URL for the 5xx-spike alert. **This one isn't truly optional despite having a placeholder default in `docker-compose.yml`** — Grafana's alerting provisioner refuses to start at all (confirmed by testing: the whole container crash-loops, not just alerting) if this resolves to an empty string. Set a real one, or leave the placeholder and edit the contact point in the Grafana UI (Alerting → Contact points) after first login.
4. From `observability/`, run `docker compose up -d`.
5. Confirm Loki is healthy: `docker exec notastray-loki wget -qO- http://localhost:3100/ready` should print `ready` (it returns `503` for the first ~20–30s after startup — that's normal, not a misconfiguration).
6. Log into Grafana at `https://<GRAFANA_PUBLIC_DOMAIN>` with the admin credentials from step 3. Both datasources (Loki, Infinity) and both dashboards (in the **NotAStray** folder) are already provisioned — check **Connections → Data sources** to confirm they show green, and **Dashboards → NotAStray** for the two dashboards.
7. Open the **Business & Growth** dashboard → dashboard settings → Variables → set `app_url` to the exact same origin as `APP_BASE_URL` in step 3. This is a per-dashboard textbox variable, not something that comes from `observability/.env` — dashboard JSON doesn't get container env-var expansion the way datasource provisioning YAML does, so it has to be set in both places and kept in sync manually.
8. In the app's Vercel env vars, set `LOKI_PUSH_URL=https://<LOKI_PUBLIC_DOMAIN>` plus the matching username/password from step 3, `INTERNAL_METRICS_API_KEY` (same value as step 3), and enable Vercel Cron Jobs for the project (provisions `CRON_SECRET` automatically) — then redeploy.

### Local testing without real domains

`observability/docker-compose.yml` binds Grafana to `127.0.0.1:3001` and Loki to `127.0.0.1:3100` directly (in addition to the Caddy path), specifically so the stack can be smoke-tested locally without DNS/TLS:

```
cd observability
cp .env.example .env   # fill in GRAFANA_ADMIN_PASSWORD, INTERNAL_METRICS_API_KEY; dummy values are fine for LOKI_PUBLIC_DOMAIN etc. locally
docker compose up -d loki grafana   # skip caddy locally, it needs real public domains for TLS
```

Then hit `http://localhost:3100/ready` and `http://localhost:3001` directly. This is how the whole stack was actually verified end-to-end — not just Loki push/query, but confirming both datasources, both dashboards, and the alert rule + contact point all provision without errors, and (in a follow-up pass, once real usage surfaced problems) that the Business & Growth panels actually render data rather than erroring. Several real bugs were caught and fixed this way, not just reasoned about:

- An empty `ALERT_WEBHOOK_URL` crash-loops the entire Grafana container, not just the alert (see the warning in step 3 above).
- A bare object at a query's JSON root (e.g. `{"activatedTags": 12, ...}`) crashes Infinity's panel renderer — it needs an array of rows. Every `/api/internal/metrics/*` endpoint now wraps single-row responses as `{ data: [ {...} ] }`, and multi-row breakdowns (species, acquisition) return a proper `data: [{...}, {...}]` array alongside the keyed object form.
- Infinity blocks every URL by default — its datasource needs an explicit `allowedHosts` entry (`APP_BASE_URL`, added to `datasources.yml`) or every panel 403s with "requested URL not allowed."
- Even with the above two fixed, panels silently returned zero fields (blank, not erroring) until `"parser": "backend"` was added to every panel target — without it, Infinity fetches and parses the JSON correctly but never turns the configured `columns` into an actual Grafana field.
- `LOKI_PUSH_PASSWORD_HASH`'s bcrypt hash contains `$` characters, which Docker Compose reinterprets as variable references unless escaped to `$$` (see step 3 above) — this one silently corrupts the value rather than erroring, so it's easy to miss until Loki starts rejecting the app's pushed logs with 401s.

All five were reproduced and the fixes verified against a live (isolated, throwaway) Grafana instance querying a mock server with realistic response shapes — not just inferred from documentation.

## What "instrumented" means so far (Phase 1 + 2 scope)

All 36 API routes under `app/api/**/route.ts` are wrapped with `withObservability` — every raw `console.log`/`console.error` call has been replaced with structured `log.info/warn/error(event, fields)` calls. Revenue-critical routes (checkout, subscribe, webhook) and product-critical routes (notify-owner, rescue-crew, scan-events) were prioritized first; the rest followed mechanically. PII (raw email, phone, precise GPS) is deliberately kept out of log field values — booleans/counts/ids are logged instead (e.g. `hasPhone: true`, not the phone number itself) — Loki logs don't get the same `beforeSend` scrubbing Sentry events do.

### UTM/attribution capture

`lib/observability/attribution.ts` captures first-touch `utm_source`/`utm_medium`/`utm_campaign` + referrer into a 30-day `nas_attribution` cookie on first page load (wired into `AuthContext.tsx`'s existing mount effect — first touch only, never overwritten by a later visit). It's read:
- Server-side via `getAttributionFromRequest(request)` in `checkout`/`subscribe` — the cookie rides along automatically on same-origin fetches, so no client call site needed to change its request body. Stripe session `metadata.utm_source/medium/campaign` carries it through to the webhook, which copies it onto the `orders` doc and (on subscription creation only, so cancel/update writes don't clobber it) the `users/{uid}.subscription.acquisition` field.
- Client-side via `getAttribution()` in `AuthContext.tsx`'s `signUp`, written onto the new user doc as `acquisition: { source, medium, campaign, referrer }`.

### Rescue Crew engagement events

`lib/observability/productEvents.ts` writes lightweight docs to a `product_events` Firestore collection (server-only, no client rules) — `rescue_crew_contact_created` when an owner adds a contact, `rescue_crew_viewed` when a scanner actually sees contacts on a lost-pet profile (i.e. the tag is lost + active + has ≥1 opted-in contact — not logged on every profile view, only real exposures). Writes are fire-and-forget-style: failures are logged via `log.warn` but never break the request.

### Using the pattern in a route

```ts
import { withObservability } from '@/lib/observability/withObservability'
import { log } from '@/lib/observability/logger'

export const GET = withObservability('route-name', async (request: Request) => {
  log.info('something_happened', { someField: 'value' })
  // ... your existing handler body, including your own try/catch if you
  // want to return a custom error response instead of the wrapper's
  // generic 500.
})
```

- `log.info/warn/error(event, fields)` — call from anywhere in the request's call stack (not just the route file itself); it's request-scoped via `AsyncLocalStorage`, so a shared helper module can log without needing the request/requestId threaded through as a parameter.
- The wrapper logs `api_request` (status, duration) on every call, and `api_error` + a Sentry report on anything the handler throws and doesn't catch itself.
- If a route already catches its own errors and returns a graceful fallback (like `ip-location` does), the wrapper's own catch block never fires for those — that's intentional, it only steps in for genuinely unhandled exceptions.

## Sentry setup notes

- Config lives in `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` (registers the above based on `NEXT_RUNTIME`), and `instrumentation-client.ts` (browser-side init).
- `tracesSampleRate` is `0.1` everywhere — deliberately conservative to stay inside the free tier's span quota. Session Replay is **not** enabled (see comment in `instrumentation-client.ts`) — this app renders pet-owner PII on screen and Replay needs DOM-masking rules configured before it's safe to turn on.
- `lib/observability/sentryScrub.ts` runs as `beforeSend` on every init (server/edge/client). It strips cookies/auth headers, and recursively redacts any object key matching an email/phone/lat/lng/address/SSN/DOB pattern before the event leaves the app. If you add a new PII field name that doesn't match the existing pattern, add it to `PII_KEY_PATTERN`.
- `next.config.js`'s CSP `connect-src` was extended to allow `https://*.sentry.io` / `https://*.ingest.us.sentry.io` — the client SDK will be silently blocked by CSP without this.
- With no `SENTRY_AUTH_TOKEN` set, the build skips source-map upload entirely (`disableServerWebpackPlugin`/`disableClientWebpackPlugin` in `next.config.js`) rather than failing — safe for local dev and before the Sentry project exists.

### Mapping a Sentry error back to a customer

Scrubbing strips email/phone/GPS from Sentry events, but every authenticated route calls `setRequestUser(uid)` (from `lib/observability/logger.ts`) right after verifying the caller's identity — `uid` is the Firestore/Firebase Auth user id, never PII. `withObservability` reads it via `getRequestUserId()` and attaches it to both the Sentry event's `user.id` field and a `userId` tag on every exception, and every Loki log line for that request also carries it. To find out who hit an error:

1. In Sentry, search by the `userId` tag (or filter by the "User" field in the issue's context) to get the uid.
2. Look that uid up directly in the Firestore console under `users/{uid}` for their real email/phone/name.

This is wired into every route that authenticates a caller (Bearer token, Stripe webhook `session.metadata.userId`, etc.) — about 20 of the 36 routes; the rest (admin/dev/test tools, unauthenticated public routes with no associated owner) don't have a user to attach. `notify-owner` is a partial exception: the *scanner* hitting that route is anonymous, but it tags the *pet owner's* uid instead, since an error there is the owner's notification failing to deliver, not the scanner's problem.

## Free-tier limits to watch

- **Sentry**: free tier error/span quotas — if `tracesSampleRate: 0.1` isn't enough headroom as traffic grows, lower it further before paying, or move error volume down by fixing the noisiest routes first.
- **Loki retention**: `observability/loki-config.yml` keeps 30 days (`retention_period: 720h`). Raise it if you need longer lookback, but that grows disk usage on the box linearly.

## Upgrade path

Nothing above is meant to be permanent infrastructure. When it's time to pay for more:
- **Sentry** → upgrade the plan; no code changes, same DSN.
- **Grafana/Loki** → point `LOKI_PUSH_URL` at Grafana Cloud's Loki endpoint instead of the self-hosted box, and import the same dashboard JSON there. The app-side code (`lib/observability/*`) doesn't change either way.

## The internal metrics API

Five read-only, `X-Internal-Metrics-Key`-protected endpoints under `app/api/internal/metrics/`, all backed by Firestore `count()`/`sum()` aggregation queries (not full document reads) wherever the query shape allows it:

| Endpoint | Returns |
|---|---|
| `/summary` | Total/activated tags, total customers, active subscribers, MRR (estimated from plan counts — see the constant comment in the route, must stay in sync with `subscribe/route.ts`'s prices), total/30-day revenue, newsletter subscriber count. |
| `/species-breakdown` | Activated-tag counts by species (Dog/Cat/Other/Unknown) — one `count()` per known species value, since Firestore has no `GROUP BY`. |
| `/rescue-crew-usage` | Total contacts configured (collection-group `count()` over every owner's `rescueCrew` subcollection), distinct owners with ≥1 contact, and finder-facing view counts — sourced from the `product_events` writes added in Phase 2. |
| `/acquisition` | Orders/signups/revenue grouped by UTM source, read+tallied in memory over a bounded recent window (`?days=`, default 90, capped at 365) — genuinely no way to `GROUP BY` this in Firestore, so this one doesn't use aggregation queries. |
| `/revenue-timeseries` | Daily revenue/orders/subscriber deltas for a date range (`?days=`, default 30), read from the `daily_metrics` rollup collection — see below. Every day in the range is filled in explicitly, including zero-days before the rollup started running; that's a real "no data yet" signal, not a bug. |

### The daily rollup

`app/api/internal/rollup/daily/route.ts`, scheduled via `vercel.json`'s `crons` entry (`10 0 * * *`, i.e. 00:10 UTC daily) to compute the **prior** full day's numbers and write them to `daily_metrics/{YYYY-MM-DD}`. Accepts either Vercel Cron's automatic `Authorization: Bearer $CRON_SECRET` header or the `X-Internal-Metrics-Key` header (for manual backfill: `curl -H "X-Internal-Metrics-Key: ..." ".../api/internal/rollup/daily?date=2026-07-01"`).

New-subscriber and canceled-subscriber counts come from two new product events (`subscription_started`, `subscription_canceled`) written by `webhook/route.ts` — deliberately *not* from `users.subscription.createdAt`, because that field gets overwritten on every subscription update (renewals, metadata syncs), not just the original signup, which would have made "new subscribers today" silently wrong. New-activated-tag counts use the `tags.activatedAt` field directly, which is set once at activation and never touched by later updates (confirmed by checking `admin/reassign-tag` and `admin/reset-tag`, neither of which write it except reset explicitly nulling it back out).

## Grafana dashboards

Both live in the **NotAStray** folder, provisioned from `observability/grafana/dashboards/*.json`:

- **Ops (SRE)** (`ops-dashboard.json`) — request rate, 5xx/4xx rate, p50/p95/p99 latency, top error routes, a filtered view of every `*_failed` log event (this catches essentially all integration failures — Twilio, SendGrid, EasyPost, Stripe — because Phase 2's log event names consistently end in `_failed`), and a live error stream. All Loki-sourced; links out to Sentry for stack-trace-level detail.
- **Business & Growth** (`business-growth-dashboard.json`) — activated tags, customers, active subscribers, MRR, revenue trend, subscriber growth, species split, Rescue Crew adoption, acquisition channel breakdown, newsletter subscribers. All Infinity-sourced, hitting the internal metrics API. Has one dashboard variable, `app_url`, that must be set after import (see setup step 7 above).
- **5xx alert** (`observability/grafana/provisioning/alerting/error-rate-alert.yml`) — fires when the 5xx rate exceeds 0.1 req/s sustained for 5 minutes; notifies via the `ALERT_WEBHOOK_URL` contact point. The threshold is a starting guess, not a tuned value — adjust once real traffic gives a sense of normal noise.

## Still to come

Nothing planned — all three phases of `specs/observability-platform.md` are built. Natural next iterations, if traffic/growth justifies them: tune the alert threshold against real data, add a Slack/Discord contact point beyond the generic webhook, and revisit the acquisition endpoint's in-memory tally (documented in its own code comment) if `orders`/`users` volume grows enough to make the `?days=` cap matter.

See `specs/observability-platform.md` for the full original plan.
