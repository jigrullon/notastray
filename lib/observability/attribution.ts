const COOKIE_NAME = 'nas_attribution'
const COOKIE_MAX_AGE_DAYS = 30

export interface Attribution {
  source: string | null
  medium: string | null
  campaign: string | null
  referrer: string | null
}

function readClientCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Captures first-touch UTM/referrer attribution into a 30-day cookie, once
 * per browser. A later visit with different (or no) UTM params never
 * overwrites the original touch — "how did they first hear about us" is
 * what the marketing/growth dashboard wants, not the last link clicked
 * before converting. Client-only; no-ops during SSR.
 */
export function captureAttribution(): void {
  if (typeof document === 'undefined') return
  if (readClientCookie(COOKIE_NAME)) return // first touch already recorded

  const params = new URLSearchParams(window.location.search)
  const source = params.get('utm_source')
  const medium = params.get('utm_medium')
  const campaign = params.get('utm_campaign')
  const referrer = document.referrer || null

  // Direct visit, no UTM params, no referrer — nothing worth attributing.
  if (!source && !medium && !campaign && !referrer) return

  const attribution: Attribution = { source, medium, campaign, referrer }
  const expires = new Date(Date.now() + COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(attribution))}; expires=${expires}; path=/; SameSite=Lax`
}

/** Client-side read of the captured attribution, e.g. at signup. */
export function getAttribution(): Attribution | null {
  if (typeof document === 'undefined') return null
  const raw = readClientCookie(COOKIE_NAME)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Attribution
  } catch {
    return null
  }
}

/**
 * Server-side read of the same cookie from a request's Cookie header —
 * used by API routes (checkout, subscribe) that can't call document.cookie.
 * The cookie rides along automatically on same-origin fetches, so no
 * client-side call site needs to thread attribution through its body.
 */
export function getAttributionFromRequest(request: Request): Attribution | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[1])) as Attribution
  } catch {
    return null
  }
}
