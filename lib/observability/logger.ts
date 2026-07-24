import { AsyncLocalStorage } from 'node:async_hooks'
import { after } from 'next/server'

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogLine {
  timestamp: string
  level: LogLevel
  event: string
  route?: string
  requestId?: string
  [key: string]: unknown
}

interface RequestLogContext {
  route: string
  requestId: string
  buffer: LogLine[]
  userId?: string
}

const storage = new AsyncLocalStorage<RequestLogContext>()

/**
 * Loki push errors must never surface to the caller — observability plumbing
 * failing silently is the correct behavior; it must not break the response
 * it's trying to observe.
 */
async function pushToLoki(lines: LogLine[]): Promise<void> {
  const url = process.env.LOKI_PUSH_URL
  if (!url || lines.length === 0) return

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.LOKI_PUSH_USERNAME && process.env.LOKI_PUSH_PASSWORD) {
      const basic = Buffer.from(
        `${process.env.LOKI_PUSH_USERNAME}:${process.env.LOKI_PUSH_PASSWORD}`
      ).toString('base64')
      headers.Authorization = `Basic ${basic}`
    }

    const streamsByLabel = new Map<string, LogLine[]>()
    for (const line of lines) {
      const key = `${line.level}|${line.route ?? 'unknown'}`
      const bucket = streamsByLabel.get(key) ?? []
      bucket.push(line)
      streamsByLabel.set(key, bucket)
    }

    const streams = Array.from(streamsByLabel.entries()).map(([key, bucketLines]) => {
      const [level, route] = key.split('|')
      return {
        stream: { app: 'notastray', level, route },
        // Loki wants unix-nanosecond timestamps as strings. Date.parse's
        // millisecond count already exceeds Number.MAX_SAFE_INTEGER once
        // scaled to nanoseconds, so pad as a string instead of doing the
        // multiplication as a Number (which would lose precision).
        values: bucketLines.map((l) => [
          `${Date.parse(l.timestamp)}000000`,
          JSON.stringify(l),
        ]),
      }
    })

    await fetch(`${url}/loki/api/v1/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ streams }),
    })
  } catch {
    // Swallow — see doc comment above.
  }
}

function record(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const ctx = storage.getStore()
  const line: LogLine = {
    timestamp: new Date().toISOString(),
    level,
    event,
    route: ctx?.route,
    requestId: ctx?.requestId,
    userId: ctx?.userId,
    ...fields,
  }

  // Always mirror to stdout so raw platform logs remain useful on their own.
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  consoleMethod(JSON.stringify(line))

  ctx?.buffer.push(line)
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => record('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => record('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => record('error', event, fields),
}

/**
 * Attaches an opaque user identifier (the Firestore/Firebase Auth uid — never
 * an email or phone number) to the current request's context. Every log line
 * for this request carries it from this point on, and `withObservability`
 * reads it via `getRequestUserId()` to tag Sentry events with the same id.
 * This is the support-lookup path: search Sentry or Loki by uid, then look
 * that uid up in the Firestore console to find the actual customer — the id
 * itself carries no PII, so it's safe to send to Sentry even with scrubbing
 * enabled.
 */
export function setRequestUser(userId: string): void {
  const ctx = storage.getStore()
  if (ctx) ctx.userId = userId
}

/** Reads the current request's user id, if `setRequestUser` was called. */
export function getRequestUserId(): string | undefined {
  return storage.getStore()?.userId
}

/**
 * Runs `fn` with a request-scoped log buffer attached via AsyncLocalStorage,
 * so any `log.*()` call anywhere in the call stack — including helper
 * modules that don't have access to the request object — lands in the
 * right request's batch. Flushes to Loki via `after()` once the response
 * has been sent, so shipping logs never adds latency to the request.
 */
export function runWithRequestLog<T>(
  route: string,
  requestId: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const ctx: RequestLogContext = { route, requestId, buffer: [] }
  return storage.run(ctx, () => {
    const result = fn()
    after(() => pushToLoki(ctx.buffer))
    return result
  })
}
