import { NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CheckoutRequest {
    items: Array<{
        name: string;
        color: string;
        size: string;
        quantity: number;
        price: number;
    }>;
    userEmail?: string;
    userId?: string;
    includeSubscription?: boolean;
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
        const { items, userEmail, userId, includeSubscription } = body;

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${item.name} - ${item.color} / ${item.size}`,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        // If includeSubscription, add subscription line item
        if (includeSubscription) {
            line_items.push({
                price: 'price_REPLACE_WITH_REAL_ID',
                quantity: 1,
            });
        }

        const mode = includeSubscription ? 'subscription' : 'payment';

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode,
            success_url: `${new URL(request.url).origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(request.url).origin}/shop/checkout`,
            metadata: {
                userId: userId || '',
                items: JSON.stringify(items.map(i => ({ name: i.name, color: i.color, size: i.size, quantity: i.quantity, price: i.price }))),
                type: includeSubscription ? 'subscription_upgrade' : 'one_time_purchase',
            },
        };

        // Only add customer_email if provided and not a guest placeholder
        if (userEmail && userEmail !== 'guest@example.com') {
            sessionParams.customer_email = userEmail;
        }

        // Shipping options are NOT supported in subscription mode
        if (mode === 'payment') {
            sessionParams.shipping_options = [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 499, currency: 'usd' },
                        display_name: 'Standard Shipping (5-7 business days)',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 5 },
                            maximum: { unit: 'business_day', value: 7 },
                        },
                    },
                },
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 999, currency: 'usd' },
                        display_name: 'Expedited Shipping (2-3 business days)',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 2 },
                            maximum: { unit: 'business_day', value: 3 },
                        },
                    },
                },
            ];

            sessionParams.shipping_address_collection = {
                allowed_countries: ['US', 'CA'],
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return NextResponse.json({ id: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
