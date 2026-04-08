import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface SubscribeRequest {
    plan: 'monthly' | 'yearly';
    userEmail?: string;
    userId?: string;
}

async function checkExistingSubscription(userId: string): Promise<boolean> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId || !userId) return false;

    try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
        const response = await fetch(firestoreUrl, { method: 'GET' });
        if (!response.ok) return false;

        const doc = await response.json();
        const subscriptionStatus = doc.fields?.subscription?.mapValue?.fields?.status?.stringValue;
        return subscriptionStatus === 'active';
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const body: SubscribeRequest = await request.json();
        const { plan, userEmail, userId } = body;

        // Block if user already has an active subscription in Firestore
        if (userId) {
            const alreadySubscribed = await checkExistingSubscription(userId);
            if (alreadySubscribed) {
                return NextResponse.json(
                    { error: 'You already have an active PROTECT Plan subscription.' },
                    { status: 409 }
                );
            }
        }

        // Also check Stripe for active subscriptions by email to catch edge cases
        // Use limit: 5 and iterate all customers — each checkout may create a separate customer
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

        const priceData = plan === 'yearly'
            ? { unit_amount: 3000, interval: 'year' as const }
            : { unit_amount: 300, interval: 'month' as const };

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'PROTECT Plan',
                            description: plan === 'yearly'
                                ? 'Annual PROTECT plan — instant SMS/Email alerts, advanced location tracking, and detailed medical profile.'
                                : 'Monthly PROTECT plan — instant SMS/Email alerts, advanced location tracking, and detailed medical profile.',
                        },
                        unit_amount: priceData.unit_amount,
                        recurring: {
                            interval: priceData.interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${new URL(request.url).origin}/dashboard?subscribed=true`,
            cancel_url: `${new URL(request.url).origin}/dashboard`,
            metadata: {
                userId: userId || '',
                plan,
                type: 'protect_subscription',
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
        console.error('Stripe Subscribe Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
