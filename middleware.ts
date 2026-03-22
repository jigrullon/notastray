import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const comingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true'
  if (!comingSoon) return NextResponse.next()

  const { pathname, searchParams } = request.nextUrl
  const secret = process.env.COMING_SOON_SECRET || ''

  // Check for bypass via query param — set cookie and continue
  const previewParam = searchParams.get('preview')
  if (previewParam && previewParam === secret) {
    const response = NextResponse.next()
    response.cookies.set('preview', secret, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  }

  // Check for existing bypass cookie
  const previewCookie = request.cookies.get('preview')?.value
  if (previewCookie === secret) {
    return NextResponse.next()
  }

  // Already on coming-soon page — don't redirect loop
  if (pathname === '/coming-soon') {
    return NextResponse.next()
  }

  // Redirect to coming soon
  const url = request.nextUrl.clone()
  url.pathname = '/coming-soon'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /api/* (API routes must remain functional)
     * - /pet/* (QR code scans must still work)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, static files
     */
    '/((?!api|pet|_next/static|_next/image|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp)).*)',
  ],
}
