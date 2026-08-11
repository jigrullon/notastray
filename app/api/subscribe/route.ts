import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';
import { getAttributionFromRequest } from '@/lib/observability/attribution';
import { PRICE_LOOKUP_KEYS, resolvePrice } from '@/lib/stripePricing';

interface SubscribeRequest {
    plan: 'monthly' | 'yearly';
    userEmail?: string;
    userId?: string;
}

async function checkExistingSubscription(userId: string, stripe: Stripe): Promise<boolean> {
    try {
        const doc = await adminDb.collection('users').doc(userId).get();
        const firestoreSub = doc.data()?.subscription;

        // If Firestore says canceled, it's definitely not active
        if (firestoreSub?.status === 'canceled') {
            return false;
        }

        // If Firestore says active, verify it still exists in Stripe
        if (firestoreSub?.status === 'active' && firestoreSub?.stripeSubscriptionId) {
            try {
                const stripeSub = await stripe.subscriptions.retrieve(firestoreSub.stripeSubscriptionId);
                return stripeSub.status === 'active';
            } catch (e) {
                // Subscription doesn't exist in Stripe anymore, clear it
                await adminDb.collection('users').doc(userId).set({
                    subscription: {
                        status: 'canceled',
                        canceledAt: new Date().toISOString(),
                    },
                }, { merge: true });
                return false;
            }
        }

        return false;
    } catch {
        return false;
    }
}

export const POST = withObservability('subscribe', async (request: Request) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const body: SubscribeRequest = await request.json();
        const { plan, userEmail, userId } = body;
        if (userId) setRequestUser(userId);

        if (userId) {
            const alreadySubscribed = await checkExistingSubscription(userId, stripe);
            if (alreadySubscribed) {
                return NextResponse.json(
                    { error: 'You already have an active PROTECT Plan subscription.' },
                    { status: 409 }
                );
            }
        }

        if (userEmail && userEmail !== 'guest@example.com') {
            const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 5 });
            for (const customer of existingCustomers.data) {
                const activeSubs = await stripe.subscriptions.list({
                    customer: customer.id,
                    status: 'active',
                    limit: 1,
                });
                if (activeSubs.data.length > 0) {
                    return NextResponse.json(
                        { error: 'You already have an active PROTECT Plan subscription.' },
                        { status: 409 }
                    );
                }
            }
        }

        const attribution = getAttributionFromRequest(request);

        // Plan pricing lives in the Stripe catalog. Editing a price there changes
        // what's charged without a deploy — note the site still *displays* the
        // price from hardcoded copy, so a price change is still a code change.
        const planPrice = await resolvePrice(
            stripe,
            plan === 'yearly' ? PRICE_LOOKUP_KEYS.protectYearly : PRICE_LOOKUP_KEYS.protectMonthly
        );

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [{ price: planPrice.id, quantity: 1 }],
            mode: 'subscription',
            // Shows the promotion code field on PROTECT signups.
            //
            // Safe to have on now that line items reference real catalog products
            // (see lib/stripePricing.ts). Scope is enforced by the coupon itself:
            // a coupon with `applies_to` set to the tag product is rejected here,
            // and one scoped to the PROTECT product is rejected in the shop.
            //
            // That protection depends on every coupon actually setting
            // `applies_to`. A coupon created WITHOUT it applies to everything and
            // will discount both tags and subscriptions.
            //
            // Coupon duration matters here in a way it doesn't for one-time tag
            // orders: 'forever' discounts EVERY renewal, permanently. Use 'once'
            // or 'repeating' unless a permanent price cut is intended. The
            // subscription emails already render a discounted first period as
            // "paid today" vs "renews at".
            allow_promotion_codes: true,
            success_url: `${new URL(request.url).origin}/dashboard?subscribed=true`,
            cancel_url: `${new URL(request.url).origin}/dashboard`,
            metadata: {
                userId: userId || '',
                plan,
                type: 'protect_subscription',
                utm_source: attribution?.source || '',
                utm_medium: attribution?.medium || '',
                utm_campaign: attribution?.campaign || '',
            },
            subscription_data: {
                metadata: {
                    userId: userId || '',
                    plan,
                },
            },
        };

        if (userEmail && userEmail !== 'guest@example.com') {
            sessionParams.customer_email = userEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        log.error('subscribe_session_failed', { error: error.message });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
})
