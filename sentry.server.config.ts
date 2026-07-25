import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from '@/lib/observability/sentryScrub'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  // Keep sampling low to stay inside the free tier's span quota; raise once
  // volume justifies a paid plan (see OBSERVABILITY.md).
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
})
