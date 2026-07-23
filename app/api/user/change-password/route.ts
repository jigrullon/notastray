import { NextResponse, NextRequest } from 'next/server';
import { verifyBearerToken } from '@/lib/apiAuth';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getPasswordChangedEmail } from '@/lib/emailTemplates';
import { sendEmail } from '@/lib/sendEmail';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// How recently tokensValidAfterTime must have moved for us to believe a
// password change just happened. Generous enough to absorb the round trip
// between the client's updatePassword() call and this request.
const RECENT_CHANGE_WINDOW_MS = 5 * 60 * 1000;

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// 5 notifications per hour per uid — the password itself is already changed
// client-side by the time this runs; this just guards the notification email.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: false,
});

// Called after the client has already changed the password via the Firebase
// client SDK (which requires reauthentication). This endpoint only sends the
// "your password was changed" security alert email — it does not touch the
// password itself.
export async function POST(request: NextRequest) {
  const { decoded, error } = await verifyBearerToken(request);
  if (error) return error;

  const uid = decoded.uid;
  const email = decoded.email ?? '';
  const displayName = decoded.name;

  if (!email) {
    return NextResponse.json({ success: true });
  }

  // Confirm a password change actually happened rather than trusting the
  // caller's say-so: Firebase bumps tokensValidAfterTime on the user record
  // whenever the backend processes a credential change (password reset,
  // password update, etc). If it hasn't moved recently, don't send the alert.
  const userRecord = await adminAuth.getUser(uid);
  const tokensValidAfterMs = userRecord.tokensValidAfterTime
    ? new Date(userRecord.tokensValidAfterTime).getTime()
    : 0;
  if (Date.now() - tokensValidAfterMs > RECENT_CHANGE_WINDOW_MS) {
    return NextResponse.json({ success: true });
  }

  const { success: withinLimit } = await ratelimit.limit(`change-password:${uid}`);
  if (!withinLimit) {
    return NextResponse.json({ success: true });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://notastray.com';

  try {
    const emailContent = getPasswordChangedEmail({
      customerName: displayName,
      changedAt: new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC',
      resetUrl: `${appUrl}/forgot-password`,
    });
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: 'support@notastray.com',
    });
  } catch (err) {
    console.error('change-password: failed to send security notification email', err);
  }

  return NextResponse.json({ success: true });
}
