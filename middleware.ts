import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: false,
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit all API routes except the Stripe webhook
  // (webhook is already protected by Stripe signature verification and needs to accept retries)
  if (pathname.startsWith('/api/') && pathname !== '/api/webhook') {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // Pass API and pet QR scan routes through without coming-soon redirect
  if (pathname.startsWith('/api/') || pathname.startsWith('/pet/')) {
    return NextResponse.next()
  }

  // Coming-soon redirect logic
  const comingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true'
  if (!comingSoon) return NextResponse.next()

  const { searchParams } = request.nextUrl
  const secret = process.env.COMING_SOON_SECRET || ''

  const previewParam = searchParams.get('preview')
  if (previewParam && previewParam === secret) {
    const response = NextResponse.next()
    response.cookies.set('preview', secret, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  }

  const previewCookie = request.cookies.get('preview')?.value
  if (previewCookie === secret) {
    return NextResponse.next()
  }

  if (pathname === '/coming-soon') {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/coming-soon'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp)).*)',
  ],
}
