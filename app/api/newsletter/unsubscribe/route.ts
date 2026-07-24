import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

function encodeEmailId(email: string): string {
  return encodeURIComponent(email.toLowerCase().trim()).replace(/\./g, '%2E');
}

export const POST = withObservability('newsletter-unsubscribe', async (request: Request) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const docId = encodeEmailId(email);
    await adminDb.collection('newsletter_subscribers').doc(docId).set(
      { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error('newsletter_unsubscribe_post_failed', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
})

export const GET = withObservability('newsletter-unsubscribe', async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required.' }, { status: 400 });
  }

  try {
    const docId = encodeEmailId(email);
    await adminDb.collection('newsletter_subscribers').doc(docId).set(
      { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'You have been unsubscribed from our newsletter.'
    });
  } catch (error: any) {
    log.error('newsletter_unsubscribe_get_failed', { error: error.message });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
})
