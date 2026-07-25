import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { log, runWithRequestLog, getRequestUserId } from './logger'

// `request: any` (not `Request`) is deliberate: TypeScript checks function
// parameters contravariantly even inside a generic constraint, so a fixed
// `Request` param here would reject handlers typed with `NextRequest` (a
// narrower type). `any` sidesteps that check; the real parameter type is
// still `Request` in the wrapper implementation below.
type AnyRouteHandler = (request: any, ...args: any[]) => Promise<Response>

/**
 * Wraps a Next.js route handler with request logging (shipped to Loki) and
 * exception reporting (shipped to Sentry). Response shape/status codes are
 * unchanged for handlers that already catch their own errors — this only
 * adds instrumentation, and re-throws unexpected errors after reporting
 * them so a route without its own try/catch still returns a 500 instead of
 * crashing the function silently.
 *
 * Generic over the exact handler type (rather than a fixed `Request` param)
 * so it accepts Next's narrower `NextRequest`/`NextResponse` types and
 * dynamic-route handlers with a second `{ params }` argument without a
 * contravariance mismatch.
 */
export function withObservability<H extends AnyRouteHandler>(
  routeName: string,
  handler: H
): H {
  return (async (request: Request, ...args: unknown[]): Promise<Response> => {
    const requestId = crypto.randomUUID()
    const method = request.method

    return runWithRequestLog(routeName, requestId, async () => {
      const startedAt = Date.now()

      try {
        const response = await (handler as AnyRouteHandler)(request, ...args)
        log.info('api_request', {
          method,
          status: response.status,
          duration_ms: Date.now() - startedAt,
        })
        return response
      } catch (error) {
        const duration_ms = Date.now() - startedAt
        const message = error instanceof Error ? error.message : String(error)
        const stack = error instanceof Error ? error.stack : undefined

        log.error('api_error', { method, duration_ms, error: message, stack })

        // userId (the Firestore/Firebase Auth uid, never an email or phone)
        // is attached whenever a route has called setRequestUser() after
        // authenticating — lets support search Sentry/Loki by uid and cross-
        // reference it in the Firestore console without PII ever reaching
        // Sentry.
        const userId = getRequestUserId()
        Sentry.captureException(error, {
          tags: { route: routeName, requestId, ...(userId && { userId }) },
          ...(userId && { user: { id: userId } }),
        })

        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    })
  }) as H
}
