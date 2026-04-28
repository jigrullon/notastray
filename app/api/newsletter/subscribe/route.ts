import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';

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

function generateConfirmationEmail(email: string): { subject: string; htmlBody: string } {
    const unsubscribeLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://notastray.com'}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;

    return {
        subject: '🐾 Welcome to NotAStray Updates',
        htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1f2937; margin: 0;">Thanks for subscribing! 🐾</h2>
                </div>

                <p style="color: #374151; line-height: 1.6;">
                    Welcome to NotAStray! You're now subscribed to our newsletter and will receive updates about:
                </p>

                <ul style="color: #374151; line-height: 1.8;">
                    <li>New features and product launches</li>
                    <li>Pet safety tips and best practices</li>
                    <li>Special offers on pet ID tags</li>
                    <li>Community stories and success stories</li>
                </ul>

                <p style="color: #374151; line-height: 1.6;">
                    We're committed to helping lost pets get home faster—one scan at a time.
                </p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                        <a href="${unsubscribeLink}" style="color: #6b7280; text-decoration: underline;">
                            Unsubscribe from newsletters
                        </a>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        NotAStray • Helping lost pets get home faster<br/>
                        <a href="https://notastray.com/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a>
                    </p>
                </div>
            </div>
        `
    };
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

        const { subject, htmlBody } = generateConfirmationEmail(email);
        try {
            await sendEmail({ to: email, subject, htmlBody });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the subscription if email fails to send
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Newsletter subscribe error:', error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
