import { NextResponse, NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { generateVerificationToken } from '@/lib/emailVerification';
import { getEmailVerificationEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// 3 sends per 15 minutes per uid (covers initial + resends from a single endpoint)
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '15 m'),
  analytics: false,
});

export async function POST(request: NextRequest) {
  // ── 1. Authenticate: require Bearer token ──────────────────────────────
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const idToken = authHeader.slice(7);

  let uid: string;
  let email: string;
  let emailVerified: boolean;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? '';
    emailVerified = decoded.email_verified ?? false;
  } catch (err) {
    console.error('send-verification-email: token verification failed', err);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired authorization token' },
      { status: 401 }
    );
  }

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'No email address on this account' },
      { status: 400 }
    );
  }

  // ── 2. Short-circuit if already verified ───────────────────────────────
  if (emailVerified) {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  // ── 3. Rate limit by uid ───────────────────────────────────────────────
  const { success: withinLimit } = await ratelimit.limit(`verify-email:${uid}`);
  if (!withinLimit) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Too many verification email requests. Please wait 15 minutes before trying again.',
      },
      { status: 429 }
    );
  }

  // ── 4. Parse optional body ─────────────────────────────────────────────
  let continueUrl: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (
      typeof body.continueUrl === 'string' &&
      body.continueUrl.startsWith('/')
    ) {
      continueUrl = body.continueUrl;
    }
    // Silently ignore continueUrl values that don't start with '/'
  } catch {
    // Body parse errors are non-fatal; proceed without continueUrl
  }

  // ── 5. Generate token + build verification link ────────────────────────
  let token: string;
  try {
    token = generateVerificationToken({ uid, email, continueUrl });
  } catch (err) {
    console.error('send-verification-email: token generation failed', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate verification token' },
      { status: 500 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://notastray.com';
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  // ── 6. Send email ──────────────────────────────────────────────────────
  try {
    const emailContent = getEmailVerificationEmail({ verifyUrl });
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: 'support@notastray.com',
    });
  } catch (err) {
    console.error('send-verification-email: SES send failed', err);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification email' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
