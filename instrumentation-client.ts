import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from '@/lib/observability/sentryScrub'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  // Session Replay is intentionally not enabled: this app renders pet-owner
  // PII (contact info, precise scan location) on screen, and replay would
  // need careful DOM masking configured before it's safe to turn on.
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
