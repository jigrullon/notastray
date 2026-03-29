import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface SubscribeRequest {
    plan: 'monthly' | 'yearly';
    userEmail?: string;
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
        const body: SubscribeRequest = await request.json();
        const { plan, userEmail, userId } = body;

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
