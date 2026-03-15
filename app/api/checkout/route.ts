import { NextResponse } from 'next/server';
import Stripe from 'stripe';


interface CheckoutRequest {
    items: Array<{
        priceId?: string;
        name?: string;
        amount?: number;
        quantity: number;
        currency?: string;
    }>;
    subscription?: boolean;
    userEmail?: string;
    userId?: string;
    color?: string;
    size?: string;
}

export async function POST(request: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    try {
        const body: CheckoutRequest = await request.json();
        const { items, subscription, userEmail, userId, color, size } = body;

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
            if (item.priceId && item.priceId !== 'price_REPLACE_WITH_REAL_ID') {
                return {
                    price: item.priceId,
                    quantity: item.quantity,
                };
            } else {
                return {
                    price_data: {
                        currency: item.currency || 'usd',
                        product_data: {
                            name: item.name || 'Product',
                        },
                        unit_amount: Math.round((item.amount || 0) * 100),
                    },
                    quantity: item.quantity,
                };
            }
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: line_items,
            mode: subscription ? 'subscription' : 'payment',
            success_url: `${new URL(request.url).origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(request.url).origin}/shop/checkout`,
            customer_email: userEmail,
            metadata: {
                userId: userId || '',
                color: color || '',
                size: size || '',
                ...(subscription ? { type: 'subscription_upgrade' } : { type: 'one_time_purchase' }),
            },
        });

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
