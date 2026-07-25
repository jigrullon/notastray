import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';

export const POST = withObservability('subscribe-status', async (request: Request) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const { userEmail, userId } = await request.json();
        if (userId) setRequestUser(userId);

        // Check Firestore first (fastest path)
        if (userId) {
            try {
                const doc = await adminDb.collection('users').doc(userId).get();
                const sub = doc.data()?.subscription;
                if (sub?.status === 'active' && sub?.stripeSubscriptionId) {
                    // Verify this subscription still exists in Stripe
                    try {
                        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
                        if (stripeSub.status === 'active') {
                            return NextResponse.json({
                                status: 'active',
                                plan: sub.plan || 'monthly',
                                stripeSubscriptionId: sub.stripeSubscriptionId || '',
                                currentPeriodEnd: sub.currentPeriodEnd || '',
                            });
                        }
                    } catch (e) {
                        // Subscription doesn't exist in Stripe - clear from Firestore
                        log.info('subscription_not_found_in_stripe_cleared', { userId });
                        await adminDb.collection('users').doc(userId).set({
                            subscription: {
                                status: 'canceled',
                                canceledAt: new Date().toISOString(),
                            },
                        }, { merge: true });
                    }
                }
            } catch (e) {
                log.warn('subscribe_status_firestore_check_failed', {
                    error: e instanceof Error ? e.message : String(e),
                });
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
                                    currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
                                    createdAt: new Date(sub.created * 1000).toISOString(),
                                },
                            }, { merge: true });
                        } catch (e) {
                            log.error('subscribe_status_firestore_sync_failed', {
                                error: e instanceof Error ? e.message : String(e),
                            });
                        }
                    }

                    return NextResponse.json({
                        status: 'active',
                        plan,
                        stripeSubscriptionId: sub.id,
                        currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
                    });
                }
            }
        }

        return NextResponse.json({ status: 'none' });
    } catch (error: any) {
        log.error('subscribe_status_failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
})
