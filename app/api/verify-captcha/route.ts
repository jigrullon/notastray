import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
      // No secret configured — treat as dev/skip to match the client-side
      // dev-mode behavior (lookup page skips CAPTCHA when no site key is set).
      return NextResponse.json({ success: true, skipped: true })
    }

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
    }

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()

    if (data.success !== true) {
      // Surface Google's error codes in the server log so misconfigurations
      // (e.g. invalid-input-secret, bad key type) are diagnosable instead of
      // only showing up as a generic failure in the widget.
      console.warn('CAPTCHA verification rejected:', data['error-codes'] || 'unknown')
    }

    return NextResponse.json({ success: data.success === true })
  } catch (err) {
    console.error('CAPTCHA verify error:', err)
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
  }
}
