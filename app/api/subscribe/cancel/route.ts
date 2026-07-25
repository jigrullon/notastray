import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';

interface CancelRequest {
    subscriptionId: string;
}

export const POST = withObservability('subscribe-cancel', async (request: Request) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let uid: string;
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        setRequestUser(uid);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const body: CancelRequest = await request.json();
        const { subscriptionId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        // Verify the caller owns this subscription before touching Stripe
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const storedSubscriptionId = userDoc.data()?.subscription?.stripeSubscriptionId;
        if (storedSubscriptionId !== subscriptionId) {
            return NextResponse.json({ error: 'You do not have permission to cancel this subscription' }, { status: 403 });
        }

        const subscription = await stripe.subscriptions.cancel(subscriptionId);

        // Update Firestore to reflect cancellation
        if (subscription.status === 'canceled') {
            try {
                await adminDb.collection('users').doc(uid).set({
                    subscription: {
                        status: 'canceled',
                        canceledAt: new Date().toISOString(),
                    },
                }, { merge: true });
            } catch (firestoreError) {
                log.error('subscription_cancel_firestore_update_failed', {
                    error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
                });
                // Don't fail the response - cancellation succeeded in Stripe
            }
        }

        return NextResponse.json({ status: subscription.status });
    } catch (error: any) {
        log.error('subscribe_cancel_failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
})
