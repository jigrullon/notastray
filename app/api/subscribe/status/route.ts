import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const { userEmail, userId } = await request.json();

        // Check Firestore first (fastest path)
        if (userId) {
            try {
                const doc = await adminDb.collection('users').doc(userId).get();
                const sub = doc.data()?.subscription;
                if (sub?.status === 'active') {
                    return NextResponse.json({
                        status: 'active',
                        plan: sub.plan || 'monthly',
                        stripeSubscriptionId: sub.stripeSubscriptionId || '',
                        currentPeriodEnd: sub.currentPeriodEnd || '',
                    });
                }
            } catch (e) {
                console.error('Firestore check failed, falling back to Stripe:', e);
            }
        }

        // Fallback: check Stripe directly by email
        if (userEmail && userEmail !== 'guest@example.com') {
            const customers = await stripe.customers.list({ email: userEmail, limit: 5 });
            for (const customer of customers.data) {
                const subs = await stripe.subscriptions.list({
                    customer: customer.id,
                    status: 'active',
                    limit: 1,
                });
                if (subs.data.length > 0) {
                    const sub = subs.data[0];
                    const plan = sub.metadata?.plan ||
                        (sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly');

                    // Sync back to Firestore if userId is available
                    if (userId) {
                        try {
                            await adminDb.collection('users').doc(userId).set({
                                subscription: {
                                    status: 'active',
                                    plan,
                                    stripeSubscriptionId: sub.id,
                                    stripeCustomerId: customer.id,
                                    currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
                                    createdAt: new Date(sub.created * 1000).toISOString(),
                                },
                            }, { merge: true });
                        } catch (e) {
                            console.error('Failed to sync subscription to Firestore:', e);
                        }
                    }

                    return NextResponse.json({
                        status: 'active',
                        plan,
                        stripeSubscriptionId: sub.id,
                        currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
                    });
                }
            }
        }

        return NextResponse.json({ status: 'none' });
    } catch (error: any) {
        console.error('Subscription status error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
