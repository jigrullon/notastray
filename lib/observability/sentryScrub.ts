import type { ErrorEvent, EventHint } from '@sentry/nextjs'

/**
 * This app handles pet-owner PII (email, phone, precise GPS from lost-pet
 * scans, shipping addresses) — see NOTIFICATION_SYSTEM.md. None of it should
 * leave the app unredacted just because it happened to be in scope when an
 * exception was thrown, so this runs as `beforeSend` on every Sentry init.
 */
const PII_KEY_PATTERN =
  /email|phone|latitude|longitude|^lat$|^lng$|address|ssn|dob|birthdate/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1))
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = PII_KEY_PATTERN.test(key) ? '[Redacted]' : redact(val, depth + 1)
    }
    return out
  }

  return value
}

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  if (event.user) {
    delete event.user.email
    delete event.user.ip_address
  }

  if (event.request) {
    delete event.request.cookies
    if (event.request.headers) {
      delete event.request.headers.authorization
      delete event.request.headers.cookie
    }
    if (event.request.data) {
      event.request.data = redact(event.request.data)
    }
  }

  if (event.extra) {
    event.extra = redact(event.extra) as typeof event.extra
  }

  if (event.contexts) {
    event.contexts = redact(event.contexts) as typeof event.contexts
  }

  return event
}
