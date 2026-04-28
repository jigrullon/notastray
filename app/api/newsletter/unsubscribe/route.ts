import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

function encodeEmailId(email: string): string {
  return encodeURIComponent(email.toLowerCase().trim()).replace(/\./g, '%2E');
}

export async function POST(request: Request) {
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
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
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
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
