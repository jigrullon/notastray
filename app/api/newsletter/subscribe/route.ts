import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function encodeEmailId(email: string): string {
    return encodeURIComponent(email.toLowerCase().trim()).replace(/\./g, '%2E');
}

async function checkAlreadySubscribed(email: string): Promise<boolean> {
    const docId = encodeEmailId(email);
    const doc = await adminDb.collection('newsletter_subscribers').doc(docId).get();
    return doc.exists && doc.data()?.status === 'active';
}

async function writeSubscriberToFirestore(email: string, source: string): Promise<void> {
    const docId = encodeEmailId(email);
    await adminDb.collection('newsletter_subscribers').doc(docId).set({
        email: email.toLowerCase().trim(),
        source,
        status: 'active',
        subscribedAt: new Date().toISOString(),
    }, { merge: true });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, source = 'unknown' } = body;

        if (!email || !EMAIL_REGEX.test(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        const alreadySubscribed = await checkAlreadySubscribed(email);
        if (alreadySubscribed) {
            return NextResponse.json({ success: true, alreadySubscribed: true });
        }

        await writeSubscriberToFirestore(email, source);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Newsletter subscribe error:', error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
