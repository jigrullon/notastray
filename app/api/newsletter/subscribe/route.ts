import { NextResponse } from 'next/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function encodeEmailId(email: string): string {
    return encodeURIComponent(email.toLowerCase().trim()).replace(/\./g, '%2E');
}

async function writeSubscriberToFirestore(email: string, source: string): Promise<void> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Firebase project ID not configured');
    }

    const docId = encodeEmailId(email);
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletter_subscribers?documentId=${docId}`;

    const doc = {
        fields: {
            email: { stringValue: email.toLowerCase().trim() },
            source: { stringValue: source },
            status: { stringValue: 'active' },
            subscribedAt: { stringValue: new Date().toISOString() },
        }
    };

    const response = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
    });

    if (!response.ok) {
        // If document already exists (409), update it instead
        if (response.status === 409) {
            const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletter_subscribers/${docId}`;
            const patchResponse = await fetch(patchUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc),
            });
            if (!patchResponse.ok) {
                const errText = await patchResponse.text();
                console.error('Firestore newsletter patch error:', errText);
            }
        } else {
            const errText = await response.text();
            console.error('Firestore newsletter write error:', errText);
            throw new Error('Failed to save subscriber');
        }
    }
}

async function checkAlreadySubscribed(email: string): Promise<boolean> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) return false;

    const docId = encodeEmailId(email);
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/newsletter_subscribers/${docId}`;

    try {
        const response = await fetch(firestoreUrl, { method: 'GET' });
        if (!response.ok) return false;
        const doc = await response.json();
        return doc.fields?.status?.stringValue === 'active';
    } catch {
        return false;
    }
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
