import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

interface CancelRequest {
    subscriptionId: string;
    userId?: string;
}

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const body: CancelRequest = await request.json();
        const { subscriptionId, userId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.cancel(subscriptionId);

        // Update Firestore to reflect cancellation
        if (userId && subscription.status === 'canceled') {
            try {
                await adminDb.collection('users').doc(userId).set({
                    subscription: {
                        status: 'canceled',
                        canceledAt: new Date().toISOString(),
                    },
                }, { merge: true });
            } catch (firestoreError) {
                console.error('Failed to update Firestore after cancellation:', firestoreError);
                // Don't fail the response - cancellation succeeded in Stripe
            }
        }

        return NextResponse.json({ status: subscription.status });
    } catch (error: any) {
        console.error('Stripe Cancel Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
