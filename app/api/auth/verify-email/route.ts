import { NextResponse, NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { validateVerificationToken } from '@/lib/emailVerification';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Light IP-based rate limit to slow automated scanning
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  analytics: false,
});

export async function POST(request: NextRequest) {
  // ── 1. Rate limit by IP ────────────────────────────────────────────────
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'anonymous';

  const { success: withinLimit } = await ratelimit.limit(
    `verify-email-confirm:${ip}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Too many verification attempts. Please try again in 15 minutes.',
      },
      { status: 429 }
    );
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────
  let token: string;
  try {
    const body = await request.json();
    token = body?.token;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid', error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (typeof token !== 'string' || !token) {
    return NextResponse.json(
      { success: false, reason: 'invalid', error: 'Missing token' },
      { status: 400 }
    );
  }

  // ── 3. Validate token ──────────────────────────────────────────────────
  const validated = validateVerificationToken(token);

  if (!validated.valid) {
    return NextResponse.json(
      { success: false, reason: validated.reason },
      { status: 400 }
    );
  }

  const { uid, email, continue: continueUrl } = validated.payload;
  const redirectTo = continueUrl || '/dashboard';

  // ── 4. Fetch Firebase user ─────────────────────────────────────────────
  let firebaseUser: Awaited<ReturnType<typeof adminAuth.getUser>>;
  try {
    firebaseUser = await adminAuth.getUser(uid);
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : '';
    if (code === 'auth/user-not-found') {
      return NextResponse.json(
        { success: false, reason: 'user-not-found' },
        { status: 404 }
      );
    }
    console.error('verify-email: getUser failed', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }

  // ── 5. Guard: token email must match current account email ─────────────
  // (protects against old tokens after an email change)
  if (firebaseUser.email !== email) {
    return NextResponse.json(
      { success: false, reason: 'invalid' },
      { status: 400 }
    );
  }

  // ── 6. Short-circuit: already verified ────────────────────────────────
  if (firebaseUser.emailVerified) {
    return NextResponse.json({
      success: true,
      alreadyVerified: true,
      continue: redirectTo,
    });
  }

  // ── 7. Flip emailVerified in Firebase Auth + Firestore ─────────────────
  try {
    await adminAuth.updateUser(uid, { emailVerified: true });

    await adminDb
      .collection('users')
      .doc(uid)
      .set(
        {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  } catch (err) {
    console.error('verify-email: failed to update user', err);
    return NextResponse.json(
      { success: false, error: 'Failed to verify email' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, continue: redirectTo });
}
